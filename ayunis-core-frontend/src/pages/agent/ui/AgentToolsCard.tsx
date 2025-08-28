import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/shared/ui/shadcn/card";
import { Badge } from "@/shared/ui/shadcn/badge";

export default function AgentToolsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tools</CardTitle>
        <CardDescription>
          Configure which tools the agent can use
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Badge variant="secondary">Coming soon</Badge>
      </CardContent>
    </Card>
  );
}
