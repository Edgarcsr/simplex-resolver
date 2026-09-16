import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { flushSync } from 'react-dom'
import { toast } from 'sonner'
import {
  getDefaultProblem,
  buildInitialTableau,
  solveStepByStep,
  type SimplexProblem,
  type SimplexStep,
  type SimplexTableau,
} from '#/lib/simplex.ts'
import { SimplexTable } from '#/components/simplex-table.tsx'
import { StepExplanation } from '#/components/step-explanation.tsx'
import { startIntroTour, startFillTour, destroyTour } from '#/components/tour.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card.tsx'
import { Tooltip, TooltipTrigger, TooltipContent } from '#/components/ui/tooltip.tsx'
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '#/components/ui/sheet.tsx'
import { ScrollArea } from '#/components/ui/scroll-area.tsx'
import { Checkbox } from '#/components/ui/checkbox.tsx'
import {
  GraduationCap,
  Play,
  Eraser,
  SquarePlus,
  SquarePen,
  X,
  ChevronLeft,
  ChevronRight,
  TriangleAlert,
  Logs,
} from 'lucide-react'
import { cn } from '#/lib/utils.ts'

export const Route = createFileRoute('/')({
  component: Home,
  head: () => ({
    meta: [{ title: 'Simplex Resolver' }],
  }),
})

function blankTourCells(matrix: number[][]): number[][] {
  return matrix.map((row) => row.map(() => 0))
}

function normalizeProblem(p: SimplexProblem): SimplexProblem {
  return {
    ...p,
    objectiveFn: `Z = ${p.varNames.map((name, j) => `${p.objective[j]}${name}`).join(' + ')}`,
  }
}

function ObjectiveToggle({
  maximize,
  onChange,
  disabled,
}: {
  maximize: boolean
  onChange: (maximize: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center rounded-md bg-muted p-0.5" role="group" aria-label="Objetivo da função">
      <button
        type="button"
        onClick={() => onChange(true)}
        aria-pressed={maximize}
        disabled={disabled}
        className={cn(
          'h-7 rounded-[min(var(--radius-md),8px)] px-3 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
          maximize
            ? 'bg-background text-foreground shadow-xs'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        Max
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        aria-pressed={!maximize}
        disabled={disabled}
        className={cn(
          'h-7 rounded-[min(var(--radius-md),8px)] px-3 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
          !maximize
            ? 'bg-background text-foreground shadow-xs'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        Min
      </button>
    </div>
  )
}

function Home() {
  const [problem, setProblem] = useState<SimplexProblem>(() =>
    normalizeProblem(getDefaultProblem()),
  )
  const tableau = useMemo(() => buildInitialTableau(problem), [problem])

  const [values, setValues] = useState<number[][]>(() => blankTourCells(tableau.matrix))
  const [filledCells, setFilledCells] = useState<Set<string>>(new Set())
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [phase, setPhase] = useState<'idle' | 'filling' | 'editing' | 'ready' | 'solving'>('idle')
  const [steps, setSteps] = useState<SimplexStep[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [stepByStep, setStepByStep] = useState(true)
  const [highlight, setHighlight] = useState<{ row: number; col: number }[]>([])
  const [introTourActive, setIntroTourActive] = useState(false)
  const [fillTourActive, setFillTourActive] = useState(false)
  const [showFillWarning, setShowFillWarning] = useState(false)
  const [showLogs, setShowLogs] = useState(false)

  useEffect(() => {
    setValues(blankTourCells(tableau.matrix))
    setFilledCells(new Set())
    setDrafts({})
  }, [tableau])

  useEffect(() => {
    if (!showFillWarning) return
    const timer = setTimeout(() => setShowFillWarning(false), 4000)
    return () => clearTimeout(timer)
  }, [showFillWarning])

  const prevStepRef = useRef(-1)
  useEffect(() => {
    if (phase === 'solving' && steps[currentStep] && stepByStep && prevStepRef.current !== currentStep) {
      prevStepRef.current = currentStep
      toast(steps[currentStep].description, {
        duration: Infinity,
        closeButton: true,
        description: (
          <p className="text-center text-muted-foreground text-sm">
            {steps[currentStep].description}
          </p>
        ),
      })
    }
  }, [currentStep, phase, steps, stepByStep])

  const handleToggleMaximize = useCallback((maximize: boolean) => {
    setProblem((prev) => normalizeProblem({ ...prev, maximize }))
  }, [])

  const handleAddVariable = useCallback(() => {
    setProblem((prev) => {
      if (prev.varNames.length >= 10) return prev
      const nextIndex = prev.varNames.length
      const name = nextIndex < 26 ? String.fromCharCode(65 + nextIndex) : `V${nextIndex + 1}`
      return normalizeProblem({
        ...prev,
        varNames: [...prev.varNames, name],
        objective: [...prev.objective, 0],
        constraints: prev.constraints.map((c) => ({
          ...c,
          coefficients: [...c.coefficients, 0],
        })),
      })
    })
  }, [])

  const handleRemoveVariable = useCallback(() => {
    setProblem((prev) => {
      if (prev.varNames.length <= 2) return prev
      const last = prev.varNames.length - 1
      return normalizeProblem({
        ...prev,
        varNames: prev.varNames.slice(0, last),
        objective: prev.objective.slice(0, last),
        constraints: prev.constraints.map((c) => ({
          ...c,
          coefficients: c.coefficients.slice(0, last),
        })),
      })
    })
  }, [])

  const handleAddConstraint = useCallback(() => {
    setProblem((prev) => {
      if (prev.constraints.length >= 10) return prev
      return normalizeProblem({
        ...prev,
        constraints: [
          ...prev.constraints,
          {
            coefficients: new Array(prev.varNames.length).fill(0),
            label: `R${prev.constraints.length + 1}`,
            rhs: 0,
          },
        ],
      })
    })
  }, [])

  const handleRemoveConstraint = useCallback(() => {
    setProblem((prev) => {
      if (prev.constraints.length <= 1) return prev
      return normalizeProblem({
        ...prev,
        constraints: prev.constraints.slice(0, -1),
      })
    })
  }, [])

  const handleStartTour = useCallback(() => {
    flushSync(() => setIntroTourActive(true))
    startIntroTour(
      () => {
        setIntroTourActive(false)
        setPhase('filling')
        setTimeout(() => {
          setFillTourActive(true)
          startFillTour(
            problem,
            (step) => {
              const [r, c] = step.cell.split('-').map(Number)
              setValues((prev) => {
                const next = prev.map((row) => [...row])
                next[r][c] = step.answer
                return next
              })
              setFilledCells((prev) => new Set([...prev, step.cell]))
            },
            () => {
              setFillTourActive(false)
              setPhase('ready')
            },
          )
        }, 400)
      },
    )
  }, [problem])

  const handleManualFill = useCallback((row: number, col: number, raw: string) => {
    setDrafts((prev) => ({ ...prev, [`${row}-${col}`]: raw }))
    const num = raw === '' ? 0 : parseFloat(raw)
    if (!isNaN(num)) {
      setValues((prev) => {
        const next = prev.map((r) => [...r])
        next[row][col] = num
        return next
      })
      setFilledCells((prev) => new Set([...prev, `${row}-${col}`]))
    }
  }, [])

  const handleCommitCell = useCallback((row: number, col: number) => {
    setDrafts((prev) => {
      const next = { ...prev }
      delete next[`${row}-${col}`]
      return next
    })
  }, [])

  const handleSolve = useCallback(() => {
    if (filledCells.size === 0) {
      setShowFillWarning(true)
      return
    }
    const userTableau: SimplexTableau = {
      matrix: values.map((r) => [...r]),
      basis: tableau.basis,
      headers: tableau.headers,
    }
    const result = solveStepByStep(problem, userTableau)
    setSteps(result)
    setPhase('solving')
    if (result.length > 0) {
      const target = stepByStep ? 0 : result.length - 1
      setCurrentStep(target)
      setHighlight(result[target].highlight ?? [])
    }
  }, [problem, tableau, values, filledCells, stepByStep])

  const handleEdit = useCallback(() => {
    setSteps([])
    setCurrentStep(0)
    setHighlight([])
    setPhase('editing')
    setShowLogs(false)
  }, [])

  const handleNextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      const next = currentStep + 1
      setCurrentStep(next)
      setHighlight(steps[next].highlight ?? [])
    }
  }, [currentStep, steps])

  const handlePrevStep = useCallback(() => {
    if (currentStep > 0) {
      const prev = currentStep - 1
      setCurrentStep(prev)
      setHighlight(steps[prev].highlight ?? [])
    }
  }, [currentStep, steps])

  const handleClear = useCallback(() => {
    setValues(blankTourCells(tableau.matrix))
    setFilledCells(new Set())
    setDrafts({})
    setPhase('idle')
    setSteps([])
    setCurrentStep(0)
    setHighlight([])
    destroyTour()
  }, [tableau])

  const isOptimal = steps.length > 0 && currentStep === steps.length - 1

  const canEditStructure =
    (phase === 'idle' || phase === 'filling' || phase === 'editing') &&
    !introTourActive &&
    !fillTourActive

  const canClear = !introTourActive && !fillTourActive && (phase !== 'idle' || filledCells.size > 0)

  const currentTableau =
    phase === 'solving' && steps[currentStep]
      ? steps[currentStep].tableau
      : tableau

  return (
    <div className="flex flex-1 flex-col items-center">
      {showFillWarning && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2">
          <Card className="flex-row items-center gap-3 py-2.5 pl-4 pr-2.5 shadow-lg border-destructive/40">
            <TriangleAlert className="size-4 text-destructive shrink-0" />
            <p className="text-sm">Preencha a tabela antes de resolver.</p>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Fechar aviso"
              onClick={() => setShowFillWarning(false)}
            >
              <X />
            </Button>
          </Card>
        </div>
      )}
      <div className="w-full max-w-4xl px-6 flex flex-col items-center gap-4 md:gap-8 py-6 md:py-12">
        {/* Problema — sempre montado pra tabela não pular; mobile compacto (py-2 + conteúdo menor) em vez de sumir */}
        <Card
          className={cn(
            'w-full max-w-2xl gap-0 py-2 md:py-3',
            !(introTourActive || phase === 'filling') && 'invisible',
          )}
          data-simplex-problem
        >
          <CardHeader className="pb-1">
            <CardTitle className="text-sm">{problem.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {problem.context && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {problem.context}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Tabela */}
        <div className="w-full max-w-4xl mx-auto flex flex-col gap-2">
          <h2 className="text-lg font-bold">Tabela Simplex</h2>
          <p className="text-sm text-muted-foreground -mt-1.5">
            Preencha as células com os dados do problema.
          </p>
          <div className="mt-1 md:mt-3 flex items-stretch gap-1.5">
            <Card className="flex-1 min-w-0 py-0 overflow-hidden">
              <div className="overflow-x-auto">
                <SimplexTable
                  tableau={currentTableau}
                  values={phase === 'solving' ? currentTableau.matrix : values}
                  onChange={handleManualFill}
                  onCommit={handleCommitCell}
                  drafts={drafts}
                  editable={phase === 'idle' || phase === 'filling' || phase === 'editing'}
                  highlight={highlight}
                  pivotCell={phase === 'solving' ? steps[currentStep]?.tableau.pivot : undefined}
                  filledCells={filledCells}
                  step={currentStep}
                  enteringCol={
                    phase === 'solving' && steps[currentStep]?.explain?.kind === 'choose-pivot'
                      ? steps[currentStep].tableau.entering
                      : undefined
                  }
                  leavingRow={
                    phase === 'solving' && steps[currentStep]?.explain?.kind === 'choose-pivot'
                      ? steps[currentStep].tableau.leaving
                      : undefined
                  }
                  ratios={
                    phase === 'solving' && steps[currentStep]?.explain?.kind === 'choose-pivot'
                      ? steps[currentStep].explain?.ratios
                      : undefined
                  }
                />
              </div>
            </Card>

            {canEditStructure && (
              <div className="flex flex-col justify-center gap-1 shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Adicionar variável"
                      disabled={problem.varNames.length >= 10}
                      onClick={handleAddVariable}
                    >
                      <SquarePlus />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Adicionar variável</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remover variável"
                      disabled={problem.varNames.length <= 2}
                      onClick={handleRemoveVariable}
                    >
                      <X />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Remover variável</TooltipContent>
                </Tooltip>

                <div className="mx-1.5 h-px bg-border" />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Adicionar restrição"
                      disabled={problem.constraints.length >= 10}
                      onClick={handleAddConstraint}
                    >
                      <SquarePlus />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Adicionar restrição</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remover restrição"
                      disabled={problem.constraints.length <= 1}
                      onClick={handleRemoveConstraint}
                    >
                      <X />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Remover restrição</TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
        </div>

        {/* Controles — mesma barra, mesmos botões, na mesma posição em todas as fases;
            o que muda é apenas o estado disabled. O grupo Anterior/Próximo ocupa o
            lugar do botão Resolver durante a resolução, em vez de disputar espaço à parte. */}
        <div className="w-full max-w-4xl flex justify-between items-center">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              aria-label="Iniciar tutorial"
              disabled={phase !== 'idle' && phase !== 'filling'}
              onClick={handleStartTour}
            >
              <span className="hidden sm:inline">Iniciar Tutorial</span>
              <GraduationCap />
            </Button>
            <Button
              variant={phase === 'filling' ? 'outline' : 'ghost'}
              size="sm"
              aria-label="Limpar tabela"
              disabled={!canClear}
              onClick={handleClear}
            >
              <span className="hidden sm:inline">Limpar</span>
              <Eraser />
            </Button>
            {(phase === 'solving' || phase === 'ready') && (
              <Button
                variant="ghost"
                size="sm"
                aria-label="Editar tabela"
                onClick={handleEdit}
              >
                <span className="hidden sm:inline">Editar</span>
                <SquarePen />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
<label
               className={cn(
                 'flex items-center gap-1.5 text-xs font-medium select-none cursor-pointer transition-colors',
                 phase === 'solving' ? 'text-muted-foreground' : 'text-foreground',
               )}
             >
               <Checkbox
                 checked={stepByStep}
                 onCheckedChange={(checked) => setStepByStep(checked === true)}
                 disabled={phase === 'solving'}
                 id="stepByStep"
                 className="size-3.5 accent-primary disabled:cursor-not-allowed"
               />
               Passo a passo
             </label>
            <div className="flex items-center" data-simplex-objective>
              <ObjectiveToggle
                maximize={problem.maximize}
                onChange={handleToggleMaximize}
                disabled={phase === 'solving'}
              />
            </div>
            {phase === 'solving' && stepByStep ? (
              <div className="flex items-center rounded-md border border-border" role="group" data-slot="button-group">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="rounded-r-none"
                      aria-label="Passo anterior"
                      onClick={handlePrevStep}
                      disabled={currentStep === 0}
                    >
                      <ChevronLeft />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Passo anterior</TooltipContent>
                </Tooltip>
                <div className="h-5 w-px bg-border" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="rounded-l-none"
                      aria-label="Próximo passo"
                      onClick={handleNextStep}
                      disabled={isOptimal}
                    >
                      <ChevronRight />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isOptimal ? 'Concluído' : 'Próximo passo'}</TooltipContent>
                </Tooltip>
              </div>
            ) : phase !== 'solving' ? (
              <Button size="sm" aria-label="Resolver" onClick={handleSolve} data-simplex-solve>
                <span className="hidden sm:inline">Resolver</span>
                <Play />
              </Button>
            ) : null}
          </div>
        </div>

        {/* Logs / Passo a passo */}
        {phase === 'solving' && steps.length > 0 && (
          <Sheet open={showLogs} onOpenChange={setShowLogs}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full max-w-2xl justify-center gap-2 text-muted-foreground">
                <Logs className="size-4" />
                <span>Ver logs ({steps.length})</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[80vh]">
              <ScrollArea className="flex-1 min-h-0">
                <div className="mx-auto max-w-160 space-y-4 py-2">
                  {steps.map((step, index) => (
                    <div
                      key={index}
                      className={cn(
                        'rounded-lg border p-3 text-sm transition-colors',
                        index === currentStep
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-muted/30',
                      )}
                    >
                      <StepExplanation description={step.description} explain={step.explain} />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </div>
  )
}
