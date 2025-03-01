import { Outlet } from "react-router";

export default function MainLayout() {
  return (
    <div>
      <aside>Example sidebar</aside>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
