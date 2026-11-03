const multipliers = new Map([['R', 100n], ['P', 105n], ['HK', 115n]]);

export function priceForLevel(basePrice, level) {
 const multiplier = multipliers.get(level);
 if (multiplier === undefined) throw Error('Pilih price level R, P, atau HK.');
 if (!Number.isSafeInteger(basePrice) || basePrice < 0) throw Error('Harga jual master tidak valid.');
 const price = Number((BigInt(basePrice) * multiplier + 50n) / 100n);
 if (!Number.isSafeInteger(price)) throw Error('Harga jual melebihi batas aman.');
 return price;
}
