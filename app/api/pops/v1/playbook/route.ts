import { agentOps } from "@/lib/pops/agent-ops";
import { withAgent } from "@/lib/pops/http";

export const dynamic = "force-dynamic";

export const GET = withAgent(async (principal) => agentOps.getPlaybook(principal));
