import type { SelectQueryBuilder } from 'typeorm';
import { applySort } from 'src/common/db/apply-sort';
import { SortOrder } from 'src/common/sorting/sort';

describe(applySort.name, () => {
  function queryBuilder() {
    const builder = {
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
    };
    return builder;
  }

  const columns = { name: 'user.name', createdAt: 'user.createdAt' };

  it.each([
    [SortOrder.ASC, 'ASC'],
    [SortOrder.DESC, 'DESC'],
  ])(
    'orders by the mapped column and breaks ties by id in the same direction (%s)',
    (order, sqlOrder) => {
      const builder = queryBuilder();

      applySort(
        builder as unknown as SelectQueryBuilder<object>,
        columns,
        { field: 'name', order },
        'user.id',
      );

      expect(builder.orderBy).toHaveBeenCalledWith('user.name', sqlOrder);
      expect(builder.addOrderBy).toHaveBeenCalledWith('user.id', sqlOrder);
    },
  );
});
