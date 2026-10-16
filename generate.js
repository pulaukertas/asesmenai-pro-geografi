const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8"
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.GEMINI_API_KEY) {
      return jsonResponse({
        error: "API AI belum dikonfigurasi. Tambahkan GEMINI_API_KEY di pengaturan environment Cloudflare Pages."
      }, 503);
    }

    let input;
    try {
      input = await request.json();
    } catch {
      return jsonResponse({ error: "Body permintaan harus berupa JSON yang valid." }, 400);
    }

    const topic = String(input.topic || "").trim();
    const classLevel = String(input.classLevel || "Kelas X / Fase E");
    const count = Number(input.count || 5);
    const cognitiveLevel = String(input.cognitiveLevel || "Campuran C1-C4");

    if (!topic) return jsonResponse({ error: "Materi atau topik wajib diisi." }, 400);
    if (!Number.isInteger(count) || count < 1 || count > 20) {
      return jsonResponse({ error: "Jumlah soal harus antara 1 dan 20." }, 400);
    }

    const prompt = `Anda adalah asisten penyusun asesmen Geografi SMA Indonesia. Buat tepat ${count} soal pilihan ganda berbahasa Indonesia untuk ${classLevel}. Materi: ${topic}. Level kognitif: ${cognitiveLevel}.

Sajikan hanya JSON valid tanpa markdown dengan struktur:
{
  "title": "judul asesmen",
  "subject": "Geografi",
  "classLevel": "${classLevel}",
  "topic": "${topic.replace(/"/g, '\\"')}",
  "blueprint": [
    {"number": 1, "indicator": "indikator soal", "cognitiveLevel": "C1-C6", "topic": "submateri"}
  ],
  "questions": [
    {
      "number": 1,
      "question": "teks soal",
      "options": [
        {"label": "A", "text": "opsi A"},
        {"label": "B", "text": "opsi B"},
        {"label": "C", "text": "opsi C"},
        {"label": "D", "text": "opsi D"},
        {"label": "E", "text": "opsi E"}
      ],
      "answer": "A",
      "explanation": "pembahasan yang akurat",
      "indicator": "indikator yang diukur",
      "level": "C1-C6"
    }
  ]
}

Ketentuan: tepat ${count} soal; setiap soal memiliki tepat lima opsi A-E; hanya satu jawaban paling tepat; distraktor masuk akal; jangan mengarang fakta lokal; gunakan konsep Geografi yang akurat; pastikan blueprint sesuai dengan soal; jangan menambahkan teks di luar JSON.`;

    const model = env.GEMINI_MODEL || "gemini-2.5-flash";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;
    const aiResponse = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.35
        }
      })
    });

    const aiRaw = await aiResponse.text();
    let aiData;
    try {
      aiData = JSON.parse(aiRaw);
    } catch {
      return jsonResponse({
        error: `Penyedia AI mengembalikan respons non-JSON (HTTP ${aiResponse.status}). Periksa konfigurasi model dan API.`
      }, 502);
    }

    if (!aiResponse.ok) {
      const detail = aiData?.error?.message || `Penyedia AI gagal (HTTP ${aiResponse.status}).`;
      return jsonResponse({ error: detail }, aiResponse.status >= 500 ? 502 : 400);
    }

    const generatedText = aiData?.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("")
      .trim();

    if (!generatedText) {
      return jsonResponse({ error: "AI tidak mengembalikan teks soal. Coba lagi dengan materi yang lebih spesifik." }, 502);
    }

    let pack;
    try {
      pack = JSON.parse(generatedText);
    } catch {
      const cleaned = generatedText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      try { pack = JSON.parse(cleaned); }
      catch { return jsonResponse({ error: "AI mengembalikan format soal yang tidak valid. Silakan coba lagi." }, 502); }
    }

    if (!Array.isArray(pack.questions) || pack.questions.length !== count) {
      return jsonResponse({ error: `Validasi hasil gagal: diminta ${count} soal, AI mengembalikan ${Array.isArray(pack.questions) ? pack.questions.length : 0}. Coba lagi.` }, 502);
    }

    return jsonResponse(pack);
  } catch (error) {
    return jsonResponse({
      error: "Kesalahan internal backend saat memproses permintaan. Periksa log fungsi di Cloudflare.",
    }, 500);
  }
}

