// src/utils/serializer.ts
export const serializer = {
  serialize: (value: unknown): string => {
    return JSON.stringify(value, (_, val) => {
      // 将 Date 转换为特殊标记的字符串
      if (val instanceof Date) {
        return { __type__: 'Date', __value__: val.toISOString() };
      }
      return val;
    });
  },
  parse: (value: string): unknown => {
    return JSON.parse(value, (_, val) => {
      // 识别标记并还原 Date 对象
      if (val?.__type__ === 'Date' && val.__value__) {
        return new Date(val.__value__);
      }
      return val;
    });
  }
};
