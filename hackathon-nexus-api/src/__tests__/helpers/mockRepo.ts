import sinon from "sinon";

/** Creates a chainable TypeORM SelectQueryBuilder stub */
export function makeQueryBuilder(overrides: Record<string, any> = {}) {
  const qb: any = {};
  const chain = [
    "select", "addSelect", "from", "where", "andWhere", "orWhere",
    "groupBy", "orderBy", "addOrderBy", "skip", "take", "limit", "offset",
    "leftJoinAndSelect", "leftJoin", "innerJoin", "innerJoinAndSelect",
    "insert", "into", "values", "update", "set", "delete",
  ];
  chain.forEach((m) => { qb[m] = sinon.stub().returns(qb); });

  // Terminator stubs – override these per test
  qb.execute = sinon.stub().resolves({ raw: [], affected: 1 });
  qb.getRawMany = sinon.stub().resolves([]);
  qb.getRawOne = sinon.stub().resolves(null);
  qb.getMany = sinon.stub().resolves([]);
  qb.getManyAndCount = sinon.stub().resolves([[], 0]);
  qb.getOne = sinon.stub().resolves(null);
  qb.getCount = sinon.stub().resolves(0);

  // subQuery returns the same chainable builder
  qb.subQuery = sinon.stub().returns(qb);
  qb.getQuery = sinon.stub().returns("1=1");

  Object.assign(qb, overrides);
  return qb;
}

/** Creates a stub TypeORM Repository */
export function makeRepo(overrides: Record<string, any> = {}) {
  const qb = makeQueryBuilder();
  return {
    findOneBy: sinon.stub().resolves(null),
    findOne: sinon.stub().resolves(null),
    find: sinon.stub().resolves([]),
    create: sinon.stub().callsFake((data: any) => ({ ...data })),
    save: sinon.stub().callsFake(async (entity: any) => entity),
    remove: sinon.stub().resolves(),
    createQueryBuilder: sinon.stub().returns(qb),
    _qb: qb,
    ...overrides,
  };
}
