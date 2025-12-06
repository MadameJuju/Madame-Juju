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

// Helper seguro para obter API Key sem quebrar o app em ambientes sem 'process'
const getApiKey = (): string | undefined => {
  try {
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
    }
  } catch (e) {
    // Ignora erro de ReferenceError se process não existir
    console.warn("Ambiente não suporta process.env ou API_KEY não definida.");
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
    return "Nota: A análise de IA requer configuração da API Key. O painel continua funcional, mas o chat está indisponível no momento.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Create a context summary to avoid huge token usage if data is massive
    // For this app, we'll send the recent transactions and grouped categories
    
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
    return "Houve um erro ao conectar com o assistente inteligente.";
  }
};