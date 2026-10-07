import { getCurrentUser } from "@/auth/session";
import { Avatar } from "@/components/ui/misc";

export async function SidebarUser() {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <div className="flex items-center gap-3 rounded-xl px-2 py-2">
      <Avatar name={user.name} size={36} />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{user.name}</p>
        <p className="truncate text-xs text-muted">{user.email}</p>
      </div>
    </div>
  );
}
