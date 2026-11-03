const multipliers = new Map([['R', 100n], ['P', 105n], ['HK', 115n]]);

export function priceForLevel(purchasePrice, level) {
 const multiplier = multipliers.get(level);
 if (multiplier === undefined) throw Error('Pilih price level R, P, atau HK.');
 if (!Number.isSafeInteger(purchasePrice) || purchasePrice < 0) throw Error('Harga beli master tidak valid.');
 const roundThousands = scaled => ((scaled + 50000n) / 100000n) * 1000n;
 const baseR = roundThousands(BigInt(purchasePrice) * 130n);
 const price = Number(roundThousands(baseR * multiplier));
 if (!Number.isSafeInteger(price)) throw Error('Harga jual melebihi batas aman.');
 return price;
}
