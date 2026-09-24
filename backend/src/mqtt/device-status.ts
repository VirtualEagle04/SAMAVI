export interface DeviceStatus {
  connected: boolean
  brokerConnected: boolean
  connectedClients: number
  lastActivity: string | null
  status: "online" | "offline"
}

class DeviceStatusTracker {
  private brokerConnected = false
  private connectedClients = 0
  private lastActivity: Date | null = null
  private explicitStatus: "online" | "offline" | null = null

  public setBrokerConnected(connected: boolean) {
    this.brokerConnected = connected
    if (!connected) {
      this.connectedClients = 0
    }
  }

  public setConnectedClients(count: number) {
    this.connectedClients = count
  }

  public recordActivity() {
    this.lastActivity = new Date()
    this.explicitStatus = "online"
  }

  public setExplicitStatus(status: "online" | "offline") {
    this.explicitStatus = status
    if (status === "online") {
      this.lastActivity = new Date()
    }
  }

  public getStatus(): DeviceStatus {
    // If we have explicit LWT status online/offline
    // Or if connectedClients >= 2 (Broker has at least Backend + 1 client ESP32)
    // Or if activity was recorded in the last 60 seconds
    const now = Date.now()
    const recentActivity = this.lastActivity ? now - this.lastActivity.getTime() < 60000 : false
    const clientsConnected = this.connectedClients >= 2

    const isConnected = this.brokerConnected && (this.explicitStatus === "online" || clientsConnected || recentActivity)

    return {
      connected: isConnected,
      brokerConnected: this.brokerConnected,
      connectedClients: this.connectedClients,
      lastActivity: this.lastActivity ? this.lastActivity.toISOString() : null,
      status: isConnected ? "online" : "offline",
    }
  }
}

export const deviceTracker = new DeviceStatusTracker()
