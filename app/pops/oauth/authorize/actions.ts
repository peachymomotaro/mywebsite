"use server";
import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/pops/session";
import { authorizeOAuthClient } from "@/lib/pops/oauth";

export async function consentAction(query: string, formData: FormData) {
  await requireOwner(`/pops/oauth/authorize?${query}`);
  // Next server actions verify the request origin against the host. Binding the
  // query keeps the rendered approval tied to the exact request the owner saw.
  const callback = await authorizeOAuthClient(new URLSearchParams(query), formData.get("consent") === "approve");
  redirect(callback);
}
