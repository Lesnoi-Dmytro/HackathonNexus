import {
  Authorized,
  CurrentUser,
  Get,
  HttpCode,
  JsonController,
  NotFoundError,
  Param,
  Patch,
  QueryParams,
} from "routing-controllers";
import { AppDataSource } from "../data-source";
import { NotificationsQueryDto } from "../dto/notification.dto";
import { NotificationDto, NotificationsPageDto } from "../dto/response.dto";
import { Notification } from "../entities/Notification";
import { User } from "../entities/User";

@JsonController("/notifications")
@Authorized()
export class NotificationController {
  private get repo() {
    return AppDataSource.getRepository(Notification);
  }

  @Get("/")
  async getNotifications(
    @CurrentUser() user: User,
    @QueryParams() query: NotificationsQueryDto,
  ): Promise<NotificationsPageDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.repo
      .createQueryBuilder("n")
      .where("n.recipientId = :userId", { userId: user.id })
      .orderBy("n.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    if (query.read !== undefined) {
      qb.andWhere("n.read = :read", { read: query.read });
    }

    const [rows, total] = await qb.getManyAndCount();

    return {
      data: rows.map((n) => ({
        id: n.id,
        payload: n.payload,
        read: n.read,
        createdAt: n.createdAt,
      })),
      total,
      page,
      limit,
    };
  }

  @Patch("/:id/read")
  @HttpCode(200)
  async markRead(@CurrentUser() user: User, @Param("id") id: string): Promise<NotificationDto> {
    const notification = await this.repo.findOne({
      where: { id, recipient: { id: user.id } },
    });
    if (!notification) throw new NotFoundError("Notification not found");

    notification.read = true;
    await this.repo.save(notification);

    return {
      id: notification.id,
      payload: notification.payload,
      read: notification.read,
      createdAt: notification.createdAt,
    };
  }

  @Patch("/read-all")
  @HttpCode(200)
  async markAllRead(@CurrentUser() user: User): Promise<{ updated: number }> {
    const result = await this.repo
      .createQueryBuilder()
      .update(Notification)
      .set({ read: true })
      .where("recipientId = :userId AND read = false", { userId: user.id })
      .execute();

    return { updated: result.affected ?? 0 };
  }
}
