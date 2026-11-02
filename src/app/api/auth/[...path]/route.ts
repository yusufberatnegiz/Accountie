import { getAuth } from "@/lib/auth/server";

export const GET: ReturnType<ReturnType<typeof getAuth>["handler"]>["GET"] = (...args) => getAuth().handler().GET(...args);
export const POST: ReturnType<ReturnType<typeof getAuth>["handler"]>["POST"] = (...args) => getAuth().handler().POST(...args);
