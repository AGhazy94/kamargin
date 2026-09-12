import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SERVERS } from '@/config/servers'
import { useServer } from '@/stores/server'

const ITEMS = SERVERS.map(({ id, name }) => ({ value: id, label: name }))

export function ServerSelect() {
  const { serverId, selectServer } = useServer()

  return (
    <Select
      items={ITEMS}
      value={serverId}
      onValueChange={(value: number | null) => {
        if (value !== null) selectServer(value)
      }}
    >
      <SelectTrigger aria-label="Server" className="min-w-28 sm:min-w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ITEMS.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
