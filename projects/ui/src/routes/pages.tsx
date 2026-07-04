import { lazy } from 'react';

export const LoginPage = lazy(() =>
  import('../pages/LoginPage').then((m) => ({ default: m.LoginPage })),
);
export const TelegramAuthPage = lazy(() =>
  import('../pages/TelegramAuthPage').then((m) => ({ default: m.TelegramAuthPage })),
);
export const ChatsPage = lazy(() =>
  import('../pages/ChatsPage').then((m) => ({ default: m.ChatsPage })),
);
export const ChatPage = lazy(() =>
  import('../pages/ChatPage').then((m) => ({ default: m.ChatPage })),
);
export const ImageGeneratePage = lazy(() =>
  import('../pages/ImageGeneratePage').then((m) => ({ default: m.ImageGeneratePage })),
);
export const SettingsPage = lazy(() =>
  import('../pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
export const NotFoundPage = lazy(() =>
  import('../pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);
export const AdminIndexPage = lazy(() =>
  import('../pages/AdminIndexPage').then((m) => ({ default: m.AdminIndexPage })),
);
export const AdminModelsPage = lazy(() =>
  import('../pages/AdminModelsPage').then((m) => ({ default: m.AdminModelsPage })),
);
export const GracefulShutdownPage = lazy(() =>
  import('../pages/GracefulShutdownPage').then((m) => ({ default: m.GracefulShutdownPage })),
);
