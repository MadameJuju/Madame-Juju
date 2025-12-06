import { FinancialRecord } from '../types';
import { parseCSV } from './csvParser';

const SNAPSHOT_CSV = `Nº Pedido,Mês Venda,Fonte,Nome Cliente,Valor Gasto,Valor Cobrado,Lucro R$,Lucro %,Total Recebido,Royalties - Isabel,Royalties - Alessandra,Empresa
143,Novembro,Bel,Fernanda,"R$ 95,39","R$ 270,00","R$ 174,61","64,67%","R$ 270,00","R$ 122,23","R$ 52,38","-R$ 143,58"
144,Novembro,Bel,Sara,"R$ 30,38","R$ 430,00","R$ 399,62","92,93%","R$ 430,00","R$ 279,73","R$ 119,89","-R$ 128,58"
145,Novembro,Bel,Juliana (Decora),"R$ 10,00","R$ 94,00","R$ 84,00","89,36%","R$ 94,00","R$ 58,80","R$ 25,20","R$ 200,36"
128,Novembro,Bel,Tutu,"R$ 66,57","R$ 366,00","R$ 299,43","81,81%","R$ 366,00","R$ 209,60","R$ 89,83","-R$ 241,34"
146,Novembro,Bel,Inglids,"R$ 196,54","R$ 1.000,00","R$ 803,46","80,35%","R$ 1.000,00","R$ 562,42","R$ 241,04","R$ 295,75"
129,Novembro,Bel,Carol Werneck,"R$ 91,84","R$ 500,00","R$ 408,16","81,63%","R$ 500,00","R$ 285,71","R$ 122,45","-R$ 308,45"
130,Novembro,Bel,Ligia Hipolito,"R$ 72,11","R$ 180,00","R$ 107,89","59,94%","R$ 180,00","R$ 75,52","R$ 32,37","R$ 28,97"
136,Novembro,Bel,Tutu,"R$ 89,95","R$ 521,00","R$ 431,05","82,74%","R$ 521,00","R$ 301,74","R$ 129,32","-R$ 395,53"
150,Novembro,Bel,Tutu,"R$ 87,61","R$ 410,00","R$ 322,39","78,63%","R$ 410,00","R$ 225,67","R$ 96,72","-R$ 48,63"
131,Novembro,Bel,Jeh,"R$ 16,08","R$ 100,00","R$ 83,92","83,92%","R$ 100,00","R$ 58,74","R$ 25,18","R$ 52,85"
149,Novembro,Tráfego,Luiza Chemin,"R$ 56,42","R$ 200,00","R$ 143,58","71,79%","R$ 200,00","R$ 100,51","R$ 43,07","R$ 83,70"
133,Novembro,Bel,Priscilla,"R$ 25,42","R$ 154,00","R$ 128,58","83,49%","R$ 154,00","R$ 90,01","R$ 38,57","-R$ 422,00"
140,Novembro,Bel,Alice Abramo,"R$ 200,36","R$ 1.200,00","R$ 999,64","83,30%","R$ 360,00","R$ 699,75","R$ 299,89","-R$ 175,89"
138,Novembro,Bel,Gislene,"R$ 118,66","R$ 360,00","R$ 241,34","67,04%","R$ 400,00","R$ 168,94","R$ 72,40","R$ 9,38"
153,Novembro,Bel,Juliana,"R$ 295,75","R$ 1.105,00","R$ 809,25","73,24%","R$ 74,40","R$ 566,48","R$ 242,78","-R$ 66,74"
139,Novembro,Bel,Maria Augusta,"R$ 91,55","R$ 400,00","R$ 308,45","77,11%","R$ 448,00","R$ 215,92","R$ 92,54","-R$ 69,45"
147,Novembro,Bel,Carol (SL),"R$ 103,37","R$ 248,00","R$ 144,63","58,32%","R$ 60,00","R$ 101,24","R$ 43,39","R$ 51,90"
154,Novembro,Bel,Odete,"R$ 52,47","R$ 448,00","R$ 395,53","88,29%","R$ 472,00","R$ 276,87","R$ 118,66","-R$ 39,45"
134,Novembro,Tráfego,Luisa Helena,"R$ 11,37","R$ 200,00","R$ 188,63","94,32%","R$ 211,00","R$ 132,04","R$ 56,59","-R$ 38,57"
141,Novembro,Bel,Kiki,"R$ 52,85","R$ 118,00","R$ 65,15","55,21%","R$ 105,00","R$ 45,61","R$ 19,55","-R$ 75,74"
137,Novembro,Bel,Talita Aquino,"R$ 83,70","R$ 540,00","R$ 456,30","84,50%","R$ 98,00","R$ 319,41","R$ 136,89","R$ 37,16"
142,Novembro,Bel,Flórida,"R$ 50,00","R$ 472,00","R$ 422,00","89,41%","R$ 186,00","R$ 295,40","R$ 126,60","-R$ 87,21"
148,Novembro,Tráfego,Carol Martins,"R$ 35,11","R$ 422,00","R$ 386,89","91,68%","R$ 70,00","R$ 270,82","R$ 116,07","-R$ 48,40"
135,Novembro,Bel,Ziza,"R$ 9,38","R$ 42,00","R$ 32,62","77,67%","R$ 52,00","R$ 22,83","R$ 9,79","-R$ 89,75"
155,Novembro,Tráfego,Alessandra Caligaris,"R$ 38,26","R$ 350,00","R$ 311,74","89,07%","R$ 201,91","R$ 218,22","R$ 93,52","R$ 129,83"
156,Novembro,Tráfego,Rosely Chemin,"R$ 28,55","R$ 98,00","R$ 69,45","70,87%","R$ 42,00","R$ 48,62","R$ 20,84","-R$ 746,87"
158,Novembro,Tráfego,Olga Maria Angelucci,"R$ 237,90","R$ 620,00","R$ 382,10","61,63%","R$ 124,00","R$ 267,47","R$ 114,63","-R$ 654,85"
159,Novembro,Tráfego,Jovanilda de Farias,"R$ 30,55","R$ 70,00","R$ 39,45","56,36%","R$ 112,00","R$ 27,62","R$ 11,84","R$ 73,56"
163,Novembro,Bel,Veridiana,"R$ 13,43","R$ 52,00","R$ 38,57","74,17%","R$ 166,00","R$ 27,00","R$ 11,57","-R$ 210,78"
160,Dezembro,Tráfego,Alyne Dias,"R$ 126,17","R$ 201,91","R$ 75,74","37,51%","R$ 884,00","R$ 53,02","R$ 22,72","R$ 5,70"
161,Dezembro,Tráfego,Jessica Nicole,"R$ 79,16","R$ 140,00","R$ 60,84","43,46%","R$ 1.470,00","R$ 42,59","R$ 18,25",
164,Dezembro,Tráfego,Mariana Rocha,"R$ 36,79","R$ 124,00","R$ 87,21","70,33%","R$ 285,00","R$ 61,05","R$ 26,16",
165,Dezembro,Tráfego,Camila Campos,"R$ 63,60","R$ 112,00","R$ 48,40","43,21%","R$ 12,60","R$ 33,88","R$ 14,52",
166,Dezembro,Tráfego,Giovana Carvalho,"R$ 76,25","R$ 166,00","R$ 89,75","54,07%",,"R$ 62,83","R$ 26,93",
167,Dezembro,Bel,Inglids,"R$ 129,83","R$ 600,00","R$ 470,17","78,36%",,"R$ 329,12","R$ 141,05",
168,Dezembro,Bel,Tutu,"R$ 137,13","R$ 884,00","R$ 746,87","84,49%",,"R$ 522,81","R$ 224,06",
169,Dezembro,Bel,Caroline Gonçalves,"R$ 815,15","R$ 1.470,00","R$ 654,85","44,55%",,"R$ 458,40","R$ 196,46",
173,Dezembro,Bel,Gisele,"R$ 73,56","R$ 164,00","R$ 90,44","55,15%",,"R$ 63,31","R$ 27,13",
170,Dezembro,Bel,Karla F. Cruz,"R$ 74,22","R$ 285,00","R$ 210,78","73,96%",,"R$ 147,55","R$ 63,23",
174,Dezembro,Tráfego,Eliane,"R$ 18,30","R$ 42,00","R$ 23,70","56,43%",,"R$ 16,59","R$ 7,11"`;

let data: FinancialRecord[] = [];

try {
  // Wrapping in try/catch to ensure app never crashes on boot
  data = parseCSV(SNAPSHOT_CSV);
} catch (error) {
  console.error("Critical: Failed to parse initial data.", error);
  // Fallback to empty array to allow UI to render (white screen prevention)
  data = [];
}

export const INITIAL_DATA = data;
