import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const SAMPLE_ROWS = [
  { item: 'Dragoturkey Feather', buy: 1200, sell: 1850 },
  { item: 'Kaliptus Flower', buy: 640, sell: 590 },
  { item: 'Bandit Leather', buy: 4300, sell: 6100 },
]

const kamas = new Intl.NumberFormat('en-US')

export function HomeRoute() {
  return (
    <main className="min-h-dvh bg-background px-6 py-10 text-foreground">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h1 className="font-heading font-semibold text-3xl tracking-tight">
              Dofus Market Calculator
            </h1>
            <Badge variant="secondary">offline</Badge>
          </div>
          <p className="text-muted-foreground">
            Theme preview — swap these tokens when the design system lands.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Craft margin</CardTitle>
            <CardDescription>
              Every figure is entered by hand; nothing leaves the browser.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="cost">Craft cost</Label>
                <Input id="cost" placeholder="0" inputMode="numeric" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="price">Sale price</Label>
                <Input id="price" placeholder="0" inputMode="numeric" />
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Net margin</span>
              <span className="font-semibold text-gain text-lg">
                +{kamas.format(1750)} k
              </span>
            </div>
            <div className="flex gap-2">
              <Button>Calculate</Button>
              <Button variant="outline">Reset</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Watchlist</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Buy</TableHead>
                  <TableHead className="text-right">Sell</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SAMPLE_ROWS.map((row) => {
                  const margin = row.sell - row.buy
                  return (
                    <TableRow key={row.item}>
                      <TableCell className="font-medium">{row.item}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {kamas.format(row.buy)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {kamas.format(row.sell)}
                      </TableCell>
                      <TableCell
                        className={
                          margin >= 0
                            ? 'text-right font-medium text-gain'
                            : 'text-right font-medium text-loss'
                        }
                      >
                        {margin >= 0 ? '+' : ''}
                        {kamas.format(margin)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
