export default {
  async fetch(request, env, ctx) {
    const { method } = request;
    let prompt, model, image_url;

    if (method === "GET") {
      const url = new URL(request.url);
      prompt = url.searchParams.get("prompt");
      model = url.searchParams.get("model");
      image_url = url.searchParams.get("image_url");
    } else if (method === "POST") {
      const body = await request.json();
      prompt = body.prompt;
      model = body.model;
      image_url = body.image_url;
    } else {
      return new Response(JSON.stringify({ error: "Only GET and POST methods are supported." }), {
        status: 405,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Alias map (user input → actual model)
    const aliasMap = {
      "llama-3.1-405b": "meta-llama/llama-3.1-405b-instruct:free",
      "qwen3-235b": "qwen/qwen3-235b-a22b:free",
      "qwen3-coder": "qwen/qwen3-coder:free",
      "deepseek-r1": "deepseek/deepseek-r1:free",
      "gemma-3-27b": "google/gemma-3-27b-it:free"
    };

    if (!model || !aliasMap[model]) {
      return new Response(JSON.stringify({
        error: "Invalid or missing model.",
        available_models: Object.keys(aliasMap)
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const finalModel = aliasMap[model];

    if (!prompt) {
      return new Response(JSON.stringify({
        error: "Missing 'prompt' parameter."
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Vision input for gemma
    const messages = image_url && model === "gemma"
      ? [{
          role: "user",
          content: [
            { type: "image_url", image_url: { url: image_url } },
            { type: "text", text: prompt }
          ]
        }]
      : [{ role: "user", content: prompt }];

    const payload = {
      model: finalModel,
      messages
    };

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer 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",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" }
    });
  }
        }
