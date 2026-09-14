import { type RatioRow, type SimplexTableau } from '#/lib/simplex.ts'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table.tsx'

interface SimplexTableProps {
  tableau: SimplexTableau
  values: number[][]
  onChange?: (row: number, col: number, value: string) => void
  onCommit?: (row: number, col: number) => void
  drafts?: Record<string, string>
  editable?: boolean
  highlight?: { row: number; col: number }[]
  pivotCell?: { row: number; col: number }
  filledCells?: Set<string>
  step?: number
  enteringCol?: number
  leavingRow?: number
  ratios?: RatioRow[]
}

export function SimplexTable({
  tableau,
  values,
  onChange,
  onCommit,
  drafts = {},
  editable = false,
  highlight = [],
  pivotCell,
  filledCells = new Set(),
  step,
  enteringCol,
  leavingRow,
  ratios,
}: SimplexTableProps) {
  const isHighlighted = (row: number, col: number) =>
    highlight.some((h) => h.row === row && h.col === col)

  const isPivot = (row: number, col: number) =>
    pivotCell?.row === row && pivotCell?.col === col

  const isZRow = (row: number) => tableau.basis[row] === 'Z'

  const isFilled = (row: number, col: number) =>
    filledCells.has(`${row}-${col}`)

  const isEditableCell = () => editable

  const ratioForRow = (row: number) => ratios?.find((r) => r.row === row)

  return (
    <div data-simplex-table={step}>
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border/50">
            <TableHead className="sticky left-0 z-10 bg-background border-r border-border font-bold text-center min-w-20 text-xs uppercase tracking-widest text-muted-foreground">
              Base
            </TableHead>
            {tableau.headers.map((h, j) => (
              <TableHead
                key={j}
                className={`font-bold text-center min-w-25 text-xs uppercase tracking-widest transition-colors duration-150 ${
                  enteringCol === j
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground'
                }`}
                data-col={h}
                title={
                  enteringCol === j
                    ? `Coluna entrante: ${h}`
                    : h === 'Sol'
                      ? 'Sol: valor atual da variável básica de cada linha'
                      : undefined
                }
              >
                {h}
              </TableHead>
            ))}
            {ratios && (
              <TableHead className="font-bold text-center min-w-25 text-xs uppercase tracking-widest text-muted-foreground">
                Razão
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {values.map((row, i) => (
            <TableRow
              key={i}
              data-simplex-zrow={isZRow(i) ? true : undefined}
              className={`transition-colors duration-150 ${
                isZRow(i)
                  ? 'border-t border-border/50 bg-muted/30'
                  : leavingRow === i
                    ? 'border-border/30 bg-primary/5'
                    : 'border-border/30'
              }`}
            >
              <TableCell
                className={`sticky left-0 z-10 border-r border-border font-bold text-center text-sm ${
                  isZRow(i) ? 'bg-muted/30 text-foreground' : 'bg-background text-muted-foreground'
                }`}
                title={leavingRow === i ? `Variável de saída: ${tableau.basis[i]}` : undefined}
              >
                {tableau.basis[i]}
                {leavingRow === i && <span className="text-primary"> ↓</span>}
              </TableCell>
              {row.map((val, j) => {
                const editable_ = isEditableCell()
                const filled = isFilled(i, j)
                return (
                  <TableCell
                    key={j}
                    className={`text-center tabular-nums transition-all duration-150 ${
                      isPivot(i, j)
                        ? 'bg-primary font-bold'
                        : isHighlighted(i, j)
                          ? 'bg-muted/50'
                          : enteringCol === j
                            ? 'bg-primary/5'
                            : ''
                    }`}
                    data-row={tableau.basis[i]}
                    data-col={tableau.headers[j]}
                    data-cell={`${i}-${j}`}
                  >
                    <input
                      type="text"
                      inputMode="text"
                      value={
                        drafts[`${i}-${j}`] ??
                        (val === 0 ? '' : String(Number.isInteger(val) ? val : val.toFixed(2)))
                      }
                      onChange={(e) => onChange?.(i, j, e.target.value)}
                      onBlur={() => onCommit?.(i, j)}
                      disabled={!editable_}
                      placeholder="?"
                      className={`w-16 h-9 text-center text-sm font-mono rounded-md outline-none transition-all duration-150 disabled:cursor-default disabled:opacity-100 ${
                        isPivot(i, j) || isHighlighted(i, j)
                          ? 'bg-transparent text-black! font-semibold focus:ring-2 focus:ring-primary'
                          : filled
                            ? 'bg-muted/40 text-foreground focus:ring-2 focus:ring-primary'
                            : 'bg-muted/20 text-muted-foreground focus:ring-2 focus:ring-primary'
                      }`}
                    />
                  </TableCell>
                )
              })}
              {ratios && (
                <TableCell
                  className={`text-center tabular-nums text-sm font-mono ${
                    leavingRow === i ? 'text-primary font-bold' : 'text-muted-foreground'
                  }`}
                >
                  {isZRow(i)
                    ? '—'
                    : (() => {
                        const r = ratioForRow(i)
                        if (!r) return '—'
                        if (r.ratio === null) return '—'
                        return `${r.sol.toFixed(2)} ÷ ${r.coef.toFixed(2)} = ${r.ratio.toFixed(2)}`
                      })()}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
