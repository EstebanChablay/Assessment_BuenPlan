import { Module } from '@nestjs/common';
import { EventsModule } from './events/events.module';
import { OrdersModule } from './orders/orders.module';
import { StoreModule } from './store/store.module';

@Module({
  imports: [StoreModule, EventsModule, OrdersModule],
})
export class AppModule {}
