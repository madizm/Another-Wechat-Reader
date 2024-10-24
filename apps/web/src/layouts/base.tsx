import { Toaster } from "sonner";
import { Outlet } from "react-router-dom";

export function BaseLayout() {
  return (
    <div>
      <main className="h-screen overflow-hidden">
        <div className="h-[calc(100vh-34px)] max-w-[1280px] mx-auto my-4">
          <Outlet />
        </div>
      </main>
      <Toaster richColors position="top-right" />
    </div>
  );
}
