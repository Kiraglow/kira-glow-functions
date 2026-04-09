exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const headers = {
   'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const { messages, mode, quizAnswers } = JSON.parse(event.body);

    const CATALOGUE = `
CATALOGUE KIRA GLOW — produits disponibles sur kirafrance.com :

1. COSRX Snail Mucin 96% Essence — Essence réparatrice, hydratation intense, peaux sèches/sensibles — 15€
2. ARENCIA Rice Mochi Cleanser — Nettoyant doux, peaux sèches/sensibles/mixtes — 20€
3. BIODANCE Collagen Peptide Serum — Sérum anti-âge, éclat, peaux grasses — 16€
4. MEDICUBE Zero Pore Pad — Exfoliant, pores dilatés, acné, peaux grasses/mixtes — 20€
5. ABIB Quick Sunstick SPF50+ — Protection solaire, peaux grasses/mixtes/sensibles — 20€
6. COSRX Salicylic Acid Cleanser — Nettoyant purifiant, acné, peaux grasses/mixtes — 12€
7. COSRX AHA/BHA Toner — Toner exfoliant, éclat, acné, peaux grasses/mixtes — 12€
8. COSRX Hyaluronic Acid Cream — Crème hydratante, peaux sèches/sensibles — 15€
9. Medicube Collagen Jelly Cream — Crème anti-âge, hydratation, peaux sèches — 20€
10. Medicube PDRN Peptide Serum — Sérum hydratant anti-âge, peaux sèches — 16€
11. Medicube PDRN Glutathione Mist — Sérum mist éclat, teint terne — 15€
12. Medicube PDRN Cica Toner — Toner apaisant, peaux sensibles/sèches — inclus
13. K-SECRET Seoul 1988 Retinal Serum — Sérum anti-âge éclat, peaux ternes — 15€
14. Pyunkang Yul Low pH Cleanser — Nettoyant doux low pH, peaux sèches/sensibles — 13€
15. Round Lab Birch Sun Cream SPF50+ — Crème solaire, peaux sensibles/sèches/mixtes — 13€
16. Numbuzin No.5 Glutathione Pad — Exfoliant éclat, peaux ternes/grasses — 15€
17. Numbuzin No.9 Eye Cream — Contour des yeux anti-âge — 16€`;

    const SYSTEM_DIAGNOSTIC = `Tu es Kira, l'experte K-beauty de Kira Glow, une boutique parisienne spécialisée en skincare coréen (kirafrance.com).

Ton rôle : analyser le profil de peau de la cliente et générer un diagnostic complet et personnalisé EN JSON UNIQUEMENT.

${CATALOGUE}

RÈGLES ABSOLUES :
- Tu ne recommandes QUE des produits du catalogue ci-dessus
- Tu n'inventes jamais un produit ou un ingrédient
- Tu réponds UNIQUEMENT en JSON, sans texte avant ou après
- Ton ton est chaleureux, bienveillant, comme une amie experte
- Tu ne donnes jamais de conseils médicaux

Génère exactement ce JSON :
{
  "profile_name": "Nom poétique du profil (3-4 mots max)",
  "profile_type": "Type de peau en 2-3 mots (ex: Peau mixte sensible)",
  "profile_desc": "Description personnalisée et bienveillante en 2-3 phrases",
  "morning_routine": [
    {
      "step": 1,
      "category": "Nettoyage",
      "product_name": "Nom exact du produit catalogue",
      "why": "Pourquoi ce produit pour ce profil en 1 phrase",
      "how": "Comment l'appliquer en 1 phrase courte",
      "wait": "Temps d'attente avant étape suivante (ex: 1 min) ou null"
    }
  ],
  "evening_routine": [ ...même structure ],
  "key_actifs": [
    { "name": "Nom de l'actif", "benefit": "Bénéfice en 1 phrase" }
  ],
  "actifs_avoid": [
    { "name": "Actif à éviter", "reason": "Pourquoi pour ce profil" }
  ],
  "incompatibilities": [
    { "combo": "Actif A + Actif B", "reason": "Pourquoi incompatibles", "solution": "Comment les utiliser quand même si possible" }
  ],
  "tips": ["Conseil personnalisé 1", "Conseil personnalisé 2", "Conseil personnalisé 3"],
  "timeline": {
    "week2": "Ce que tu vas ressentir après 2 semaines",
    "month1": "Premiers résultats visibles après 1 mois",
    "month3": "Résultats attendus à 3 mois"
  }
}`;

    const SYSTEM_CHAT = `Tu es Kira, l'experte K-beauty de Kira Glow, une boutique parisienne spécialisée en skincare coréen (kirafrance.com).

Tu parles en français, avec un ton chaleureux, bienveillant et expert — comme une amie qui s'y connaît vraiment en skincare coréen.

${CATALOGUE}

TES CAPACITÉS :
- Répondre aux questions sur les produits du catalogue
- Conseiller selon le type de peau décrit
- Expliquer les ingrédients et actifs K-beauty
- Suggérer des routines personnalisées avec les produits du catalogue
- Répondre aux questions générales sur la K-beauty

RÈGLES ABSOLUES :
- Tu ne recommandes QUE des produits du catalogue Kira Glow
- Tu n'inventes jamais un produit, une marque ou un ingrédient
- Tu ne donnes jamais de conseils médicaux — si la personne a une condition médicale, tu lui conseilles de voir un dermatologue
- Tu ne parles jamais de boutiques concurrentes
- Si tu ne sais pas, tu le dis honnêtement
- Tes réponses sont concises (3-5 phrases max sauf si on te demande plus)
- Tu termines parfois tes réponses par une question pour mieux conseiller

Quand tu suggères un produit, mentionne toujours son nom exact tel qu'il apparaît dans le catalogue.`;

    let systemPrompt, userMessages;

    if (mode === 'diagnostic') {
      systemPrompt = SYSTEM_DIAGNOSTIC;
      const a = quizAnswers;
      userMessages = [{
        role: 'user',
        content: `Voici le profil de la cliente :
- Préoccupation principale : ${a.concern1 || 'non précisé'}
- Préoccupation secondaire : ${a.concern2 || 'aucune'}
- Troisième préoccupation : ${a.concern3 || 'aucune'}
- Peau en fin de journée : ${a.sebum || 'non précisé'}
- Inconfort cutané : ${a.comfort || 'non précisé'}
- Réactivité aux produits : ${a.reactivity || 'non précisé'}
- Conditions diagnostiquées : ${(a.condition || []).join(', ') || 'aucune'}
- Niveau de stress : ${a.stress || 'non précisé'}
- Sommeil : ${a.sleep || 'non précisé'}
- Environnement : ${a.environment || 'non précisé'}
- Exposition soleil : ${a.sun || 'non précisé'}
- Maquillage : ${a.makeup || 'non précisé'}
- Routine actuelle : ${a.routine || 'non précisé'}
- Textures préférées : ${(a.texture || []).join(', ') || 'non précisé'}
- Objectifs K-beauty : ${(a.goal || []).join(', ') || 'non précisé'}
- Type de routine souhaitée : ${a.effort || 'non précisé'}

Génère le diagnostic complet en JSON.`
      }];
    } else {
      systemPrompt = SYSTEM_CHAT;
      userMessages = messages;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: systemPrompt,
        messages: userMessages
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ content: data.content[0].text })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
