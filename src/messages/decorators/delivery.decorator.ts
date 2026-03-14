import { Inject } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

export function DeliveryMessage(options: {
  extractor: (result: any, ...args: any[]) => any;
  condition?: (result: any, ...args: any[]) => boolean;
}) {
  const injectEmitter = Inject(EventEmitter2);

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    injectEmitter(target, "eventEmitter");

    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);

      console.log("Delivery Message", result , args);
      if (!options.condition || options.condition(result, ...args)) {
        const payload = options.extractor(result, ...args);
        this.eventEmitter.emit("message.created", payload);
      }

      return result;
    };

    return descriptor;
  };
}