import { QrCode } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"

// Pix simulado (Futuro A e B): só muda o status da reserva, sem dinheiro nem gateway.
export function PixDrawer({
  amount,
  open,
  submitting,
  error,
  onPay,
  onClose,
}: {
  amount: string
  open: boolean
  submitting: boolean
  error: string | null
  onPay: () => void
  onClose: () => void
}) {
  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DrawerContent>
        <DrawerHeader className="items-center text-center">
          <DrawerTitle>Pague com Pix</DrawerTitle>
          <Badge variant="aviso">Simulação · nenhum dinheiro de verdade</Badge>
        </DrawerHeader>
        <div className="flex flex-col items-center gap-4 px-4">
          <span className="numero-grande">{amount}</span>
          <span aria-hidden="true" className="flex size-40 items-center justify-center rounded-xl border border-dashed border-border bg-card text-muted-foreground">
            <QrCode className="size-20" />
          </span>
        </div>
        {error && (
          <Alert variant="destructive" className="mx-4 mt-4 w-auto">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <DrawerFooter>
          <Button size="lg" disabled={submitting} onClick={onPay}>
            Simular pagamento aprovado
          </Button>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Voltar
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
