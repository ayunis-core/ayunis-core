interface PermissionGroupHeaderProps {
  label: string;
}

// Native tr/td rather than the shadcn Table primitives: the grouping band is a
// deliberate non-library wrapper, so styling lives on plain elements instead of
// overriding the shared primitives' classes.
export function PermissionGroupHeader({
  label,
}: Readonly<PermissionGroupHeaderProps>) {
  return (
    <tr className="bg-muted/50">
      <td
        colSpan={4}
        className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </td>
    </tr>
  );
}
