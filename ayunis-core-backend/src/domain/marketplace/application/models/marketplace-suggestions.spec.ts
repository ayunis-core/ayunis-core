import { aMarketplaceSkillListEntry } from 'src/domain/marketplace/application/testing/marketplace.fixtures';
import {
  MAX_MARKETPLACE_SUGGESTIONS,
  selectMarketplaceSuggestions,
} from './marketplace-suggestions';

const entry = (
  name: string,
  flags: { suggested?: boolean; featured?: boolean },
) =>
  aMarketplaceSkillListEntry({
    identifier: name.toLowerCase(),
    name,
    suggested: flags.suggested ?? true,
    featured: flags.featured ?? false,
  });

describe('selectMarketplaceSuggestions', () => {
  it('leaves out entries the marketplace does not suggest', () => {
    const suggestions = selectMarketplaceSuggestions([
      entry('Protokoll', { suggested: true }),
      entry('Wohngeld', { suggested: false }),
    ]);

    expect(suggestions.map((s) => s.name)).toEqual(['Protokoll']);
  });

  it('puts featured suggestions first, then the rest by German name order', () => {
    const suggestions = selectMarketplaceSuggestions([
      entry('Übersetzer', {}),
      entry('Zusammenfasser', { featured: true }),
      entry('Amtsblatt', {}),
      entry('Pressesprecher', {}),
    ]);

    expect(suggestions.map((s) => s.name)).toEqual([
      'Zusammenfasser',
      'Amtsblatt',
      'Pressesprecher',
      'Übersetzer',
    ]);
  });

  it(`shows at most ${MAX_MARKETPLACE_SUGGESTIONS} suggestions`, () => {
    const many = Array.from({ length: 9 }, (_, i) => entry(`Skill ${i}`, {}));

    expect(selectMarketplaceSuggestions(many)).toHaveLength(
      MAX_MARKETPLACE_SUGGESTIONS,
    );
  });
});
