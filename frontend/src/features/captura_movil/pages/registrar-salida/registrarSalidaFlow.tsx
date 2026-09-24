import { useState } from "react"
import ClientScreen from "./ClientScreen"
import ConfirmScreen from "./ConfirmScreen"
import FeedbackScreen from "./FeedbackScreen"
import OrderScreen from "./OrderScreen"
import QuantityScreen from "./QuantityScreen"
import type { SalidaCartItem, SalidaCategory, SalidaClient, SalidaOrderDraft } from "./types"

export interface RegistrarSalidaFlowProps {
  clients: SalidaClient[]
  categories: SalidaCategory[]
  isLoading?: boolean
  error?: string | null
  onBack: () => void
  onRefreshClients?: () => void
  onConfirmSalida?: (order: SalidaOrderDraft) => Promise<{ reference?: string } | void>
}

type FlowStep = "client" | "order" | "quantity" | "confirm" | "feedback"

export default function RegistrarSalidaFlow({ clients, categories, isLoading = false, error = null, onBack, onRefreshClients, onConfirmSalida }: RegistrarSalidaFlowProps) {
  const [step, setStep] = useState<FlowStep>("client")
  const [client, setClient] = useState<SalidaClient | null>(null)
  const [cart, setCart] = useState<SalidaCartItem[]>([])
  const [activeCategory, setActiveCategory] = useState<SalidaCategory | null>(null)
  const [feedbackReference, setFeedbackReference] = useState<string>()

  const selectClient = (selectedClient: SalidaClient) => {
    setClient(selectedClient)
    setStep("order")
  }

  const selectCategory = (category: SalidaCategory) => {
    setActiveCategory(category)
    setStep("quantity")
  }

  const confirmQuantity = (quantity: number) => {
    if (!activeCategory || quantity < 1 || quantity > activeCategory.cantidadBandejasDisponibles) return

    setCart((currentCart) => {
      const existing = currentCart.find((item) => item.categoria.codigo === activeCategory.codigo)
      if (existing) {
        return currentCart.map((item) => item.categoria.codigo === activeCategory.codigo ? { ...item, cantidadBandejas: quantity } : item)
      }
      return [...currentCart, { categoria: activeCategory, cantidadBandejas: quantity }]
    })
    setActiveCategory(null)
    setStep("order")
  }

  const removeItem = (codigo: string) => setCart((currentCart) => currentCart.filter((item) => item.categoria.codigo !== codigo))

  const confirmSalida = async () => {
    if (!client || cart.length === 0) return

    if (onConfirmSalida) {
      const result = await onConfirmSalida({ cliente: client, items: cart })
      setFeedbackReference(result?.reference)
    }
    setStep("feedback")
  }

  if (step === "client") {
    return <ClientScreen clients={clients} isLoading={isLoading} error={error} onBack={onBack} onSelect={selectClient} onRefresh={onRefreshClients} />
  }

  if (step === "order" && client) {
    return <OrderScreen client={client} categories={categories} cart={cart} onBack={() => setStep("client")} onSelectCategory={selectCategory} onRemoveItem={removeItem} onProceed={() => cart.length > 0 && setStep("confirm")} />
  }

  if (step === "quantity" && activeCategory) {
    const currentItem = cart.find((item) => item.categoria.codigo === activeCategory.codigo)
    return <QuantityScreen category={activeCategory} initialQuantity={currentItem?.cantidadBandejas ?? 0} onBack={() => { setActiveCategory(null); setStep("order") }} onConfirm={confirmQuantity} />
  }

  if (step === "confirm" && client) {
    return <ConfirmScreen client={client} cart={cart} onBack={() => setStep("order")} onConfirm={() => void confirmSalida()} />
  }

  if (step === "feedback" && client) {
    return <FeedbackScreen client={client} reference={feedbackReference} onDone={onBack} />
  }

  return null
}
