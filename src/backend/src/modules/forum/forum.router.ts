import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { ForumService } from "./forum.service.js";
import {
  CreatePostBodySchema,
  UpdatePostBodySchema,
  CreateCommentBodySchema,
  UpdateCommentBodySchema,
  UpdateAvatarBodySchema,
  PostsQuerySchema,
  PostIdParamsSchema,
  CommentIdParamsSchema,
} from "./forum.schema.js";
import { sendError, Errors } from "../../lib/errors.js";

const forumRouter: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const forumService = new ForumService(fastify.supabase, fastify.log);

  // ──────────────────────────────────────
  // POST /forum/posts — Create post (student only)
  // ──────────────────────────────────────
  fastify.post(
    "/posts",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      // Only students can create posts
      if (request.user.role !== "student") {
        return sendError(
          reply,
          Errors.FORBIDDEN("Solo los estudiantes pueden crear publicaciones")
        );
      }

      const parseResult = CreatePostBodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendError(
          reply,
          Errors.VALIDATION_ERROR(
            parseResult.error.issues.map((i) => i.message).join("; ")
          )
        );
      }

      try {
        const result = await forumService.createPost(
          request.user.sub,
          parseResult.data.text_content
        );
        return reply.status(201).send({ data: result });
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "error" in err &&
          "statusCode" in err
        ) {
          return sendError(reply, err as any);
        }
        request.log.error({ err }, "Create post failed");
        return sendError(reply, Errors.INTERNAL_SERVER_ERROR());
      }
    }
  );

  // ──────────────────────────────────────
  // GET /forum/posts — List all visible posts (authenticated)
  // ──────────────────────────────────────
  fastify.get(
    "/posts",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const parseResult = PostsQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return sendError(
          reply,
          Errors.VALIDATION_ERROR(
            parseResult.error.issues.map((i) => i.message).join("; ")
          )
        );
      }

      try {
        const result = await forumService.listPosts(parseResult.data);
        return reply.send({ data: result });
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "error" in err &&
          "statusCode" in err
        ) {
          return sendError(reply, err as any);
        }
        request.log.error({ err }, "List posts failed");
        return sendError(reply, Errors.INTERNAL_SERVER_ERROR());
      }
    }
  );

  // ──────────────────────────────────────
  // GET /forum/posts/mine — List current student's own posts
  // ──────────────────────────────────────
  fastify.get(
    "/posts/mine",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (request.user.role !== "student") {
        return sendError(
          reply,
          Errors.FORBIDDEN("Solo los estudiantes pueden ver sus publicaciones")
        );
      }

      try {
        const result = await forumService.getMyPosts(request.user.sub);
        return reply.send({ data: result });
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "error" in err &&
          "statusCode" in err
        ) {
          return sendError(reply, err as any);
        }
        request.log.error({ err }, "Get my posts failed");
        return sendError(reply, Errors.INTERNAL_SERVER_ERROR());
      }
    }
  );

  // ──────────────────────────────────────
  // GET /forum/posts/:postId — Get single post by ID
  // ──────────────────────────────────────
  fastify.get(
    "/posts/:postId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsResult = PostIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return sendError(
          reply,
          Errors.VALIDATION_ERROR(
            paramsResult.error.issues.map((i) => i.message).join("; ")
          )
        );
      }

      try {
        const result = await forumService.getPostById(paramsResult.data.postId);
        return reply.send({ data: result });
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "error" in err &&
          "statusCode" in err
        ) {
          return sendError(reply, err as any);
        }
        request.log.error({ err }, "Get post failed");
        return sendError(reply, Errors.INTERNAL_SERVER_ERROR());
      }
    }
  );

  // ──────────────────────────────────────
  // GET /forum/posts/:postId/comments — List comments for a post
  // ──────────────────────────────────────
  fastify.get(
    "/posts/:postId/comments",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsResult = PostIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return sendError(
          reply,
          Errors.VALIDATION_ERROR(
            paramsResult.error.issues.map((i) => i.message).join("; ")
          )
        );
      }

      try {
        const result = await forumService.getPostComments(
          paramsResult.data.postId
        );
        return reply.send({ data: result });
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "error" in err &&
          "statusCode" in err
        ) {
          return sendError(reply, err as any);
        }
        request.log.error({ err }, "Get comments failed");
        return sendError(reply, Errors.INTERNAL_SERVER_ERROR());
      }
    }
  );

  // ──────────────────────────────────────
  // PATCH /forum/posts/:postId — Update post (owner only)
  // ──────────────────────────────────────
  fastify.patch(
    "/posts/:postId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsResult = PostIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return sendError(
          reply,
          Errors.VALIDATION_ERROR(
            paramsResult.error.issues.map((i) => i.message).join("; ")
          )
        );
      }

      const bodyResult = UpdatePostBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return sendError(
          reply,
          Errors.VALIDATION_ERROR(
            bodyResult.error.issues.map((i) => i.message).join("; ")
          )
        );
      }

      try {
        const result = await forumService.updatePost(
          paramsResult.data.postId,
          request.user.sub,
          bodyResult.data.text_content
        );
        return reply.send({ data: result });
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "error" in err &&
          "statusCode" in err
        ) {
          return sendError(reply, err as any);
        }
        request.log.error({ err }, "Update post failed");
        return sendError(reply, Errors.INTERNAL_SERVER_ERROR());
      }
    }
  );

  // ──────────────────────────────────────
  // DELETE /forum/posts/:postId — Delete post (owner only)
  // ──────────────────────────────────────
  fastify.delete(
    "/posts/:postId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsResult = PostIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return sendError(
          reply,
          Errors.VALIDATION_ERROR(
            paramsResult.error.issues.map((i) => i.message).join("; ")
          )
        );
      }

      try {
        const result = await forumService.deletePost(
          paramsResult.data.postId,
          request.user.sub
        );
        return reply.send({ data: result });
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "error" in err &&
          "statusCode" in err
        ) {
          return sendError(reply, err as any);
        }
        request.log.error({ err }, "Delete post failed");
        return sendError(reply, Errors.INTERNAL_SERVER_ERROR());
      }
    }
  );

  // ──────────────────────────────────────
  // POST /forum/posts/:postId/comments — Create comment
  // ──────────────────────────────────────
  fastify.post(
    "/posts/:postId/comments",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsResult = PostIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return sendError(
          reply,
          Errors.VALIDATION_ERROR(
            paramsResult.error.issues.map((i) => i.message).join("; ")
          )
        );
      }

      const bodyResult = CreateCommentBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return sendError(
          reply,
          Errors.VALIDATION_ERROR(
            bodyResult.error.issues.map((i) => i.message).join("; ")
          )
        );
      }

      try {
        const result = await forumService.createComment(
          paramsResult.data.postId,
          request.user.sub,
          bodyResult.data.text_content
        );
        return reply.status(201).send({ data: result });
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "error" in err &&
          "statusCode" in err
        ) {
          return sendError(reply, err as any);
        }
        request.log.error({ err }, "Create comment failed");
        return sendError(reply, Errors.INTERNAL_SERVER_ERROR());
      }
    }
  );

  // ──────────────────────────────────────
  // PATCH /forum/comments/:commentId — Update comment (owner only)
  // ──────────────────────────────────────
  fastify.patch(
    "/comments/:commentId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsResult = CommentIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return sendError(
          reply,
          Errors.VALIDATION_ERROR(
            paramsResult.error.issues.map((i) => i.message).join("; ")
          )
        );
      }

      const bodyResult = UpdateCommentBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return sendError(
          reply,
          Errors.VALIDATION_ERROR(
            bodyResult.error.issues.map((i) => i.message).join("; ")
          )
        );
      }

      try {
        const result = await forumService.updateComment(
          paramsResult.data.commentId,
          request.user.sub,
          bodyResult.data.text_content
        );
        return reply.send({ data: result });
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "error" in err &&
          "statusCode" in err
        ) {
          return sendError(reply, err as any);
        }
        request.log.error({ err }, "Update comment failed");
        return sendError(reply, Errors.INTERNAL_SERVER_ERROR());
      }
    }
  );

  // ──────────────────────────────────────
  // DELETE /forum/comments/:commentId — Delete comment (owner only)
  // ──────────────────────────────────────
  fastify.delete(
    "/comments/:commentId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsResult = CommentIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return sendError(
          reply,
          Errors.VALIDATION_ERROR(
            paramsResult.error.issues.map((i) => i.message).join("; ")
          )
        );
      }

      try {
        const result = await forumService.deleteComment(
          paramsResult.data.commentId,
          request.user.sub
        );
        return reply.send({ data: result });
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "error" in err &&
          "statusCode" in err
        ) {
          return sendError(reply, err as any);
        }
        request.log.error({ err }, "Delete comment failed");
        return sendError(reply, Errors.INTERNAL_SERVER_ERROR());
      }
    }
  );

  // ──────────────────────────────────────
  // PATCH /forum/profile/avatar — Update avatar on active pseudonym (student only)
  // ──────────────────────────────────────
  fastify.patch(
    "/profile/avatar",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      // Only students can update their avatar
      if (request.user.role !== "student") {
        return sendError(
          reply,
          Errors.FORBIDDEN("Solo los estudiantes pueden actualizar su avatar")
        );
      }

      const parseResult = UpdateAvatarBodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendError(
          reply,
          Errors.VALIDATION_ERROR(
            parseResult.error.issues.map((i) => i.message).join("; ")
          )
        );
      }

      try {
        const result = await forumService.updateAvatar(
          request.user.sub,
          parseResult.data.avatar_url
        );
        return reply.send({ data: result });
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "error" in err &&
          "statusCode" in err
        ) {
          return sendError(reply, err as any);
        }
        request.log.error({ err }, "Update avatar failed");
        return sendError(reply, Errors.INTERNAL_SERVER_ERROR());
      }
    }
  );
};

export default forumRouter;
