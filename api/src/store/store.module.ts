import { Global, Module } from '@nestjs/common';
import { APP_STORE } from './store.constants';
import { appStore } from './store';

@Global()
@Module({
  providers: [{ provide: APP_STORE, useValue: appStore }],
  exports: [APP_STORE],
})
export class StoreModule {}
