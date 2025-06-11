function groupBy(array, groupKey) {
  return Object.entries(array).reduce(
    (acc, [key, values]) => {
      values.forEach((item) => {
        let existing = acc.find((x) => x[groupKey] === item[groupKey]);
        if (!existing) {
          existing = { [groupKey]: item[groupKey] };
          acc.push(existing);
        }
        existing[key] = item.value;
      });
      return acc;
    },
    []
  );
}

module.exports = groupBy;