import { type GetMenuResponse, GetMenuResponseSchema } from '@aahar/proto/catalog/v1';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import { toMenuItemSummary } from '../mappers/catalog.mapper.js';
import { redis } from '../redis/client.js';
import { getCategoriesWithItems } from './query.service.js';

export class CacheService {
	private inflightPromise: Promise<GetMenuResponse> | null = null;

	public async getMenu() {
		const data = await redis.getBuffer('catalog:menu:active');

		if (!data) {
			if (this.inflightPromise !== null) return await this.inflightPromise;

			this.inflightPromise = (async () => {
				const dbDataResponse = await this.fetchMenu();
				await redis.set('catalog:menu:active', Buffer.from(toBinary(GetMenuResponseSchema, dbDataResponse)), 'EX', 86400);

				return dbDataResponse;
			})().finally(() => {
				this.inflightPromise = null;
			});

			return await this.inflightPromise;
		} else {
			return fromBinary(GetMenuResponseSchema, data);
		}
	}

	public async invalidateMenu() {
		await redis.del('catalog:menu:active');
	}

	private async fetchMenu() {
		const data = await getCategoriesWithItems().execute();

		return create(GetMenuResponseSchema, {
			categories: data.map((category) => {
				return {
					...category,
					items: category.items.map(toMenuItemSummary)
				};
			})
		});
	}
}

export const cacheService = new CacheService();
