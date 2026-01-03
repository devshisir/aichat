import { Skeleton } from "@/components/ui/skeleton";

const ChatSkeleton = () => {
  return (
    <div className="p-4 space-y-4">
      {/* Left message (received) */}
      <div className="flex items-start gap-3 w-2/3">
        <Skeleton className="w-12 h-12 rounded-full shrink-0" />
        <div className="flex flex-col gap-2 flex-1">
          <Skeleton className="h-4 w-16 rounded" />
          <div className="bg-gray-100 rounded-2xl rounded-tl-sm p-3">
            <Skeleton className="h-4 w-48 rounded mb-2" />
            <Skeleton className="h-4 w-32 rounded" />
          </div>
        </div>
      </div>

      {/* Right message (sent) */}
      <div className="flex items-start gap-3 justify-end w-2/3 ml-auto">
        <div className="flex flex-col gap-2 flex-1">
          <Skeleton className="h-4 w-16 rounded ml-auto" />
          <div className="bg-gray-100 rounded-2xl rounded-tl-sm p-3">
            <Skeleton className="h-4 w-48 rounded mb-2" />
            <Skeleton className="h-4 w-32 rounded" />
          </div>
        </div>
        <Skeleton className="w-12 h-12 rounded-full shrink-0" />
      </div>

      {/* Another left message */}
      <div className="flex items-start gap-3 w-2/3">
        <Skeleton className="w-12 h-12 rounded-full shrink-0" />
        <div className="flex flex-col gap-2 flex-1">
          <Skeleton className="h-4 w-16 rounded" />
          <div className="bg-gray-100 rounded-2xl rounded-tl-sm p-3">
            <Skeleton className="h-4 w-48 rounded mb-2" />
            <Skeleton className="h-4 w-32 rounded" />
          </div>
        </div>
      </div>

      {/* Right message (sent) */}
      <div className="flex items-start gap-3 justify-end w-2/3 ml-auto">
        <div className="flex flex-col gap-2 flex-1">
          <Skeleton className="h-4 w-16 rounded ml-auto" />
          <div className="bg-gray-100 rounded-2xl rounded-tl-sm p-3">
            <Skeleton className="h-4 w-48 rounded mb-2" />
            <Skeleton className="h-4 w-32 rounded" />
          </div>
        </div>
        <Skeleton className="w-12 h-12 rounded-full shrink-0" />
      </div>

      {/* Another left message */}
      <div className="flex items-start gap-3 w-2/3">
        <Skeleton className="w-12 h-12 rounded-full shrink-0" />
        <div className="flex flex-col gap-2 flex-1">
          <Skeleton className="h-4 w-16 rounded" />
          <div className="bg-gray-100 rounded-2xl rounded-tl-sm p-3">
            <Skeleton className="h-4 w-48 rounded mb-2" />
            <Skeleton className="h-4 w-32 rounded" />
          </div>
        </div>
      </div>

      {/* Right message (sent) */}
      <div className="flex items-start gap-3 justify-end w-2/3 ml-auto">
        <div className="flex flex-col gap-2 flex-1">
          <Skeleton className="h-4 w-16 rounded ml-auto" />
          <div className="bg-gray-100 rounded-2xl rounded-tl-sm p-3">
            <Skeleton className="h-4 w-48 rounded mb-2" />
            <Skeleton className="h-4 w-32 rounded" />
          </div>
        </div>
        <Skeleton className="w-12 h-12 rounded-full shrink-0" />
      </div>

      {/* Another left message */}
      <div className="flex items-start gap-3 w-2/3">
        <Skeleton className="w-12 h-12 rounded-full shrink-0" />
        <div className="flex flex-col gap-2 flex-1">
          <Skeleton className="h-4 w-16 rounded" />
          <div className="bg-gray-100 rounded-2xl rounded-tl-sm p-3">
            <Skeleton className="h-4 w-48 rounded mb-2" />
            <Skeleton className="h-4 w-32 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatSkeleton;
