export const settingsService = {
  // Get custom logo
  async getLogo(): Promise<string | null> {
    try {
      const res = await fetch("/api/settings?key=custom_logo");
      if (!res.ok) return null;
      const data = await res.json();
      return data.success ? data.value : null;
    } catch (err) {
      console.error("Erro no settingsService.getLogo:", err);
      return null;
    }
  },

  // Save custom logo (Base64 string or empty string to delete)
  async saveLogo(base64Data: string): Promise<boolean> {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "custom_logo", value: base64Data }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      return data.success;
    } catch (err) {
      console.error("Erro no settingsService.saveLogo:", err);
      return false;
    }
  },

  // Remove custom logo
  async removeLogo(): Promise<boolean> {
    return this.saveLogo("");
  }
};
