import { SequenceCollections } from "@0xsequence/metadata";
import { generateNFTsMetadata, getRandomImage } from "../utils/dataGenerators";
import { updateAsset } from "../utils/updateAsset";

function findAssetWithImageField(data: {
  assets: { metadataField: string; id: string }[];
}) {
  const asset = data.assets.find((asset) => asset.metadataField === "image");
  return asset ? asset.id : null;
}

async function updateTokenIds(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadatas: any[],
  originalMetadatas,
  collectionsService,
  projectId,
  collectionId,
  projectAccessKey,
  jwtAccessKey,
) {
  if (metadatas.length > 500)
    throw new Error(
      "Invalid metadatas length. Please send maximum 500 metadatas.",
    );
  if (!projectId || !collectionId)
    throw new Error("Empty fields in create token ids");

  return await Promise.all(
    metadatas.map(async (metadata, index) => {
      const assetId = findAssetWithImageField(originalMetadatas[index]);
      const tokenId = originalMetadatas[index].token?.tokenId;

      try {
        await updateAsset(
          projectId,
          collectionId,
          assetId,
          tokenId,
          getRandomImage(),
          projectAccessKey,
          jwtAccessKey,
        );

        const updateTokenBody = {
          projectId: projectId,
          collectionId: collectionId,
          private: false,
          tokenId,
          token: { ...metadata, tokenId },
        };

        const data = await collectionsService.updateToken(updateTokenBody);

        return data;
      } catch (error) {
        return {
          ...error,
          tokenId: metadata.token.tokenId,
        };
      }
    }),
  );
}

export async function updateMetadatas(request, env) {
  const password = env.PASSWORD;
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${password}`) {
    return new Response(JSON.stringify({ result: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { collectionId } = await request.json();
  if (!collectionId || typeof collectionId !== "number") {
    return new Response(JSON.stringify({ result: "Bad Request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const METADATA_URL = "https://metadata.sequence.app";
  const jwtAccessKey = env.JWT_ACCESS_KEY;
  const projectAccessKey = env.PROJECT_ACCESS_KEY;
  const projectId = env.PROJECT_ID;
  const collectionsService = new SequenceCollections(
    METADATA_URL,
    jwtAccessKey,
  );

  const metadatasFromApi = await collectionsService.listTokens({
    projectId,
    collectionId: collectionId,
    page: {
      // We can improve this. (I expect to use 'quantity')
      pageSize: 10000,
    },
  });

  const metadatasFromApiTwo = await Promise.all(
    metadatasFromApi?.tokens?.map(async (metadata) => {
      return await collectionsService.getToken({
        projectId,
        collectionId: collectionId,
        tokenId: metadata.tokenId,
      });
    }),
  );

  const formmatedOriginalMetadata = metadatasFromApiTwo.filter(
    (metadata) =>
      metadata?.assets?.length !== 0 &&
      metadata?.assets?.find(
        (assetData) => assetData.metadataField === "image",
      ),
  );
  const metadatas = generateNFTsMetadata(formmatedOriginalMetadata.length);

  const metadataStatuses = await updateTokenIds(
    metadatas,
    formmatedOriginalMetadata,
    collectionsService,
    projectId,
    collectionId,
    projectAccessKey,
    jwtAccessKey,
  );

  const data = {
    message: "Updated Tokens",
    status: "success",
    metadataStatuses,
  };

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}
