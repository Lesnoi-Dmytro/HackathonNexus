import { ResponseWrapInterceptor } from "../middleware/ResponseWrapInterceptor";

describe("ResponseWrapInterceptor", () => {
  const interceptor = new ResponseWrapInterceptor();
  const action = {} as any;

  it("wraps a non-null value in { data }", () => {
    expect(interceptor.intercept(action, { id: 1 })).toEqual({ data: { id: 1 } });
  });

  it("wraps a string value", () => {
    expect(interceptor.intercept(action, "hello")).toEqual({ data: "hello" });
  });

  it("wraps null as { data: null }", () => {
    expect(interceptor.intercept(action, null)).toEqual({ data: null });
  });

  it("wraps undefined as { data: null }", () => {
    expect(interceptor.intercept(action, undefined)).toEqual({ data: null });
  });

  it("wraps an array", () => {
    expect(interceptor.intercept(action, [1, 2, 3])).toEqual({ data: [1, 2, 3] });
  });

  it("wraps zero (falsy number) correctly", () => {
    expect(interceptor.intercept(action, 0)).toEqual({ data: 0 });
  });
});
