import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import Groq from 'groq-sdk';
import { TeraChatDto } from './dto/tera.dto';

// Tera AI: chatbot Lentera via Groq (OpenAI-compatible).
// Default model openai/gpt-oss-20b: murah, cepat (~1000 tps), cukup pintar
// untuk chat Bahasa Indonesia. Bisa diganti lewat env TERA_MODEL
// (mis. openai/gpt-oss-120b kalau mau lebih pintar tapi lebih lambat/mahal).
const DEFAULT_MODEL = 'openai/gpt-oss-20b';
const SYSTEM_PROMPT =
  'Kamu Tera AI, asisten ramah aplikasi sosial media Lentera. ' +
  'Jawab dalam Bahasa Indonesia yang santai, singkat, dan jelas (maksimal 3 paragraf pendek). ' +
  'Kalau ditanya soal Lentera (catatan, pesan, story, postingan), bantu dengan langkah konkret.';

@Injectable()
export class TeraAiService {
  async chat(userId: string, dto: TeraChatDto) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'GROQ_API_KEY belum diisi di backend .env',
      );
    }

    const model = process.env.TERA_MODEL || DEFAULT_MODEL;
    const groq = new Groq({ apiKey });

    const history = (dto.history ?? []).slice(-20).map((h) => ({
      role: h.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: String(h.content).slice(0, 2000),
    }));

    const completion = await groq.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history,
        { role: 'user', content: dto.message.trim() },
      ],
      max_tokens: 800,
      temperature: 0.7,
      // Model reasoning gpt-oss-* wajib dikasih reasoning_effort agar
      // langsung menghasilkan content (tanpa ini content bisa kosong
      // dan hanya terisi field reasoning internal).
      ...(model.includes('gpt-oss')
        ? { reasoning_effort: 'low' as const }
        : {}),
    });

    const rawContent = completion.choices?.[0]?.message?.content?.trim();
    const reply =
      rawContent ||
      'Maaf, aku belum bisa menjawab sekarang. Coba lagi ya.';

    // userId dipakai untuk guard/auth + logging ke depan, tidak disimpan ke DB di v1.
    void userId;

    return { reply, model };
  }
}
