import { describe, expect, it } from 'vitest';
import sharp from 'sharp';

const pixels = async (file) => sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const alphaAt = ({ data, info }, x, y) => data[(y * info.width + x) * 4 + 3];

describe('the logo', () => {
  it('has a transparent background, so it sits on any page color', async () => {
    const image = await pixels('public/assets/images/carlo-app-logo.png');
    const { width, height } = image.info;
    for (const [x, y] of [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]]) {
      expect(alphaAt(image, x, y)).toBe(0);
    }
  });

  it('has no solid white pixels left', async () => {
    const { data } = await pixels('public/assets/images/carlo-app-logo.png');
    let solidWhite = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 250 && data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245) solidWhite += 1;
    }
    expect(solidWhite).toBe(0);
  });
});
