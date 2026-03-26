import axios from "axios";
import { redirect } from "next/navigation";

export async function fetchWithAuth(input: RequestInfo, init?: RequestInit) {
    let res = await fetch(input, {
        ...init,
        credentials: "include",
    });

    if (res.status === 401) {
        const refreshRes = await axios.post("/api/refresh", {
            credentials: "include",
        });

        if (refreshRes.status === 200) {
            res = await fetch(input, {
                ...init,
                credentials: "include",
            });
        } else {
            redirect("/login");
        }
    }

    return res;
}
