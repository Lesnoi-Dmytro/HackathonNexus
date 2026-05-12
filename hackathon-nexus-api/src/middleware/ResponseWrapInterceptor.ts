import { Action, Interceptor, InterceptorInterface } from "routing-controllers";

@Interceptor()
export class ResponseWrapInterceptor implements InterceptorInterface {
  intercept(_action: Action, content: unknown): { data: unknown } {
    return { data: content ?? null };
  }
}
