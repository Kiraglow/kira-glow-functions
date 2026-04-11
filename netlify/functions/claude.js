exports.handler = async function(event, context) {
  context.callbackWaitsForEmptyEventLoop = false;

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const { messages, mode, quizAnswers, email, diagnosticResult } = JSON.parse(event.body);

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

    // ==========================================
    // MODE KLAVIYO
    // ==========================================
    if (mode === 'klaviyo') {
      if (!email || !diagnosticResult) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email et diagnostic requis' }) };
      }

      const r = diagnosticResult;

      const profileRes = await fetch('https://a.klaviyo.com/api/profiles/', {
        method: 'POST',
        headers: {
          'Authorization': `Klaviyo-API-Key ${process.env.KLAVIYO_API_KEY}`,
          'Content-Type': 'application/json',
          'revision': '2024-02-15'
        },
        body: JSON.stringify({
          data: {
            type: 'profile',
            attributes: {
              email,
              properties: {
                profil_peau: r.profile_name,
                type_peau: r.profile_type,
                kira_diagnostic: true,
                diagnostic_date: new Date().toISOString().split('T')[0]
              }
            }
          }
        })
      });

      const profileData = await profileRes.json();
      const profileId = profileData?.data?.id;

      if (profileId) {
        const listsRes = await fetch('https://a.klaviyo.com/api/lists/', {
          headers: {
            'Authorization': `Klaviyo-API-Key ${process.env.KLAVIYO_API_KEY}`,
            'revision': '2024-02-15'
          }
        });
        const lists = await listsRes.json();
        const mainList = lists?.data?.find(l => l.attributes.name === 'Kira Glow — Clientes');
        if (mainList) {
          await fetch(`https://a.klaviyo.com/api/lists/${mainList.id}/relationships/profiles/`, {
            method: 'POST',
            headers: {
              'Authorization': `Klaviyo-API-Key ${process.env.KLAVIYO_API_KEY}`,
              'Content-Type': 'application/json',
              'revision': '2024-02-15'
            },
            body: JSON.stringify({ data: [{ type: 'profile', id: profileId }] })
          });
        }
      }

      const formatSteps = (steps) => {
        const result = {};
        (steps || []).forEach((s, i) => {
          const n = i + 1;
          result[`step${n}_category`] = s.category || '';
          result[`step${n}_product`] = s.product_name || '';
          result[`step${n}_why`] = s.why || '';
          result[`step${n}_how`] = s.how || '';
          result[`step${n}_wait`] = s.wait || null;
        });
        result['total'] = (steps || []).length;
        return result;
      };

      const morningSteps = formatSteps(r.morning_routine);
      const eveningSteps = formatSteps(r.evening_routine);
      const actifs = (r.key_actifs || []).map(a => `• ${a.name} : ${a.benefit}`).join('\n');
      const avoider = (r.actifs_avoid || []).map(a => `• ${a.name} : ${a.reason}`).join('\n');
      const incompats = (r.incompatibilities || []).map(i => `❌ ${i.combo}\n→ ${i.reason}${i.solution ? `\n✅ ${i.solution}` : ''}`).join('\n\n');
      const tips = (r.tips || []).map(t => `• ${t}`).join('\n');

      await fetch('https://a.klaviyo.com/api/events/', {
        method: 'POST',
        headers: {
          'Authorization': `Klaviyo-API-Key ${process.env.KLAVIYO_API_KEY}`,
          'Content-Type': 'application/json',
          'revision': '2024-02-15'
        },
        body: JSON.stringify({
          data: {
            type: 'event',
            attributes: {
              profile: { data: { type: 'profile', attributes: { email } } },
              metric: { data: { type: 'metric', attributes: { name: 'Diagnostic Complété' } } },
              properties: {
                profil_name: r.profile_name,
                profil_type: r.profile_type,
                profil_desc: r.profile_desc,
                morning_step1_category: morningSteps.step1_category || '',
                morning_step1_product: morningSteps.step1_product || '',
                morning_step1_why: morningSteps.step1_why || '',
                morning_step1_how: morningSteps.step1_how || '',
                morning_step2_category: morningSteps.step2_category || '',
                morning_step2_product: morningSteps.step2_product || '',
                morning_step2_why: morningSteps.step2_why || '',
                morning_step2_how: morningSteps.step2_how || '',
                morning_step3_category: morningSteps.step3_category || '',
                morning_step3_product: morningSteps.step3_product || '',
                morning_step3_why: morningSteps.step3_why || '',
                morning_step3_how: morningSteps.step3_how || '',
                morning_step4_category: morningSteps.step4_category || '',
                morning_step4_product: morningSteps.step4_product || '',
                morning_step4_why: morningSteps.step4_why || '',
                morning_step4_how: morningSteps.step4_how || '',
                morning_step5_category: morningSteps.step5_category || '',
                morning_step5_product: morningSteps.step5_product || '',
                morning_step5_why: morningSteps.step5_why || '',
                morning_step5_how: morningSteps.step5_how || '',
                evening_step1_category: eveningSteps.step1_category || '',
                evening_step1_product: eveningSteps.step1_product || '',
                evening_step1_why: eveningSteps.step1_why || '',
                evening_step1_how: eveningSteps.step1_how || '',
                evening_step2_category: eveningSteps.step2_category || '',
                evening_step2_product: eveningSteps.step2_product || '',
                evening_step2_why: eveningSteps.step2_why || '',
                evening_step2_how: eveningSteps.step2_how || '',
                evening_step3_category: eveningSteps.step3_category || '',
                evening_step3_product: eveningSteps.step3_product || '',
                evening_step3_why: eveningSteps.step3_why || '',
                evening_step3_how: eveningSteps.step3_how || '',
                evening_step4_category: eveningSteps.step4_category || '',
                evening_step4_product: eveningSteps.step4_product || '',
                evening_step4_why: eveningSteps.step4_why || '',
                evening_step4_how: eveningSteps.step4_how || '',
                evening_step5_category: eveningSteps.step5_category || '',
                evening_step5_product: eveningSteps.step5_product || '',
                evening_step5_why: eveningSteps.step5_why || '',
                evening_step5_how: eveningSteps.step5_how || '',
                actifs_cles: actifs,
                actifs_eviter: avoider,
                incompatibilites: incompats,
                conseils: tips,
                timeline_week2: r.timeline?.week2 || '',
                timeline_month1: r.timeline?.month1 || '',
                timeline_month3: r.timeline?.month3 || '',
                boutique_url: 'https://kirafrance.com/collections/all'
              }
            }
          }
        })
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Profil enregistré et email envoyé' })
      };
    }

    // ==========================================
    // MODE DIAGNOSTIC + CHAT
    // ==========================================
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
        max_tokens: 4000,
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
