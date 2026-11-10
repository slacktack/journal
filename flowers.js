import { PHOTOS } from './photos.js';

export { PHOTOS };
export const photo = id => PHOTOS.find(p => p.id === id);
export const photoImg = (id, cls = '') => {
  const p = photo(id);
  return p ? `<img src="${p.src}" alt="${p.name}" class="${cls}" loading="lazy" draggable="false">` : '';
};

export const GROWABLE = ['rose-pink', 'rose-peach', 'rose-white', 'rose-bunch', 'sunflower-2', 'sunflower-mini', 'tulip-red', 'lily-orange', 'orchid-pink',
  'orchid-yellow', 'calla', 'waterlily', 'dahlia-blue', 'gerbera-white', 'daisy', 'daisy-pink', 'poppy-red', 'poppy-pink', 'clematis-stem',
  'snowdrop', 'narcissus', 'flower-blue', 'cactus', 'clover', 'cypress', 'herb'];

// Garden stages: 0 seed, 1 sprout, 2 leaves, 3 bud, 4 bloom.
export function plantImg(id, stage) {
  if (stage <= 1) return photoImg('sprout', `stage s${stage}`);
  if (stage === 2) return photoImg('herb', 'stage s2');
  return photoImg(id, stage === 3 ? 'stage bud' : 'stage bloom');
}
