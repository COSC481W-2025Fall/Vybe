export async function pingAPI() {
    const base = import.meta.env.VITE_API_BASE || "http://localhost:5050";
    const res = await fetch(`${base}/api/ping`);
    return res.json();
}