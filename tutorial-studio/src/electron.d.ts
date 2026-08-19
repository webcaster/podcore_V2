export {};

declare global {
  interface Window {
    tutorialStudio?: {
      openImage: () => Promise<{ filePath: string; dataUrl: string } | null>;
      openJson: () => Promise<string | null>;
      saveJson: (payload: { defaultPath: string; content: string }) => Promise<string | null>;
      listScreens: () => Promise<Array<{ id: string; name: string; thumbnail: string; displayId: string }>>;
      openExternal: (url: string) => Promise<void>;
    };
  }
}
