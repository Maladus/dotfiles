---
description: Update GitHub Copilot model pricing in models.json from official docs
---

# Update GitHub Copilot Model Pricing

Fetch the current pricing from the official GitHub docs and update `~/.pi/agent/models.json`.

## Steps

1. Read the current `~/.pi/agent/models.json`
2. Fetch https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing
3. Compare models and prices between the file and the page
4. Update the file:
   - Remove models no longer listed on the pricing page
   - Add new models with their pricing
   - Update any changed prices
   - Keep the existing JSON structure (provider > modelOverrides > model > cost with input/output/cacheRead/cacheWrite per 1M tokens)
5. Copy the updated `~/.pi/agent/models.json` to `~/dotfiles/dot_pi/agent/models.json`
6. Report what was added, removed, or changed

## Notes

- All prices are per 1 million tokens
- Anthropic models have a cacheWrite cost; others use 0
- Use Default tier pricing (not Long context tier)
- Model names in the JSON use lowercase-kebab-case (e.g., `gpt-5.4-mini`, `claude-sonnet-4.5`)
