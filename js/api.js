const BASE_URL = "https://dashboard-pontualfc-default-rtdb.firebaseio.com/temporada_2026.json";

async function fetchData() {
    try {
        const resp = await fetch(BASE_URL);
        return await resp.json();
    } catch (err) {
        console.error("Erro ao buscar dados do Firebase:", err);
        return null;
    }
}