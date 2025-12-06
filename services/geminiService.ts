import { GoogleGenAI } from "@google/genai";
import { FinancialRecord, DashboardMetrics } from "../types";
import { formatCurrency } from "../utils/formatters";

const SYSTEM_INSTRUCTION = `
Você é um analista financeiro sênior especializado em ajudar sócios de empresas a entenderem a situação geral do negócio ("Situação Geral").
Você receberá dados financeiros brutos e métricas calculadas.
Sua missão é responder perguntas dos usuários de forma clara, concisa e orientada a negócios.
Use português do Brasil profissional.
Sempre formate valores monetários como R$ X.XXX,XX.
Se a pergunta for sobre tendências, analise as datas.
Se a pergunta for vaga (ex: "Como estamos?"), dê um resumo executivo focado em Lucro, Margem e principais ofensores de custo ou campeões de receita.
`;

// Helper seguro para obter API Key sem quebrar o app em ambientes de navegador (Vercel/Vite)
const getApiKey = (): string | undefined => {
  try {
    // Verificação estrita para evitar ReferenceError: process is not defined
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
    }
  } catch (e) {
    // Silencia o erro para não travar a aplicação (Tela Branca)
    console.warn("Ambiente não suporta process.env. Configure a variável de ambiente no seu host.");
  }
  return undefined;
};

export const analyzeData = async (
  question: string, 
  data: FinancialRecord[], 
  metrics: DashboardMetrics
): Promise<string> => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    return "⚠️ Configuração Necessária: A chave da API do Gemini não foi detectada.\n\nSe você está no Vercel, vá em 'Settings > Environment Variables' e adicione uma variável chamada 'API_KEY' com sua chave do Google AI Studio.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Group by category for context
    const catSummary: Record<string, number> = {};
    data.forEach(d => {
        const k = `${d.type} - ${d.category}`;
        catSummary[k] = (catSummary[k] || 0) + d.value;
    });

    const context = `
    Métricas Gerais:
    - Receita Total: ${formatCurrency(metrics.totalRevenue)}
    - Despesa Total: ${formatCurrency(metrics.totalExpense)}
    - Lucro Líquido: ${formatCurrency(metrics.netProfit)}
    - Margem: ${metrics.margin.toFixed(2)}%
    
    Resumo por Categoria:
    ${JSON.stringify(catSummary, null, 2)}
    
    Últimas 30 Transações (Amostra):
    ${JSON.stringify(data.slice(-30).map(d => ({
        date: d.date,
        desc: d.description,
        val: d.value,
        type: d.type
    })), null, 2)}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Contexto dos Dados:\n${context}\n\nPergunta do Usuário: ${question}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });

    return response.text || "Desculpe, não consegui analisar os dados no momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Houve um erro ao conectar com o assistente inteligente. Verifique sua conexão e se a Chave de API é válida.";
  }
};