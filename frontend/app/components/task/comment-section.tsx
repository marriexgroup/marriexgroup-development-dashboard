import type { Comment, User } from "@/types";
import { useState, useRef } from "react";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import {
  useAddCommentMutation,
  useGetCommentsByTaskIdQuery,
} from "@/hooks/use-task";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Loader } from "../loader";
import { Image as ImageIcon, X } from "lucide-react";

export const CommentSection = ({
  taskId,
  members,
}: {
  taskId: string;
  members: User[];
}) => {
  const [newComment, setNewComment] = useState("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutate: addComment, isPending } = useAddCommentMutation();
  const { data: comments, isLoading } = useGetCommentsByTaskIdQuery(taskId) as {
    data: Comment[];
    isLoading: boolean;
  };

  const processFiles = (files: FileList | File[]) => {
    const newImages: File[] = [];
    const newPreviews: string[] = [];

    Array.from(files).forEach((file) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not a valid image file`);
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Maximum size is 5MB`);
        return;
      }

      newImages.push(file);
      const preview = URL.createObjectURL(file);
      newPreviews.push(preview);
    });

    if (newImages.length > 0) {
      const updatedImages = [...selectedImages, ...newImages];
      const updatedPreviews = [...imagePreviews, ...newPreviews];
      
      setSelectedImages(updatedImages);
      setImagePreviews(updatedPreviews);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    processFiles(files);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const removeImage = (index: number) => {
    const updatedImages = selectedImages.filter((_, i) => i !== index);
    const updatedPreviews = imagePreviews.filter((_, i) => i !== index);
    
    // Revoke the object URL to free memory
    URL.revokeObjectURL(imagePreviews[index]);
    
    setSelectedImages(updatedImages);
    setImagePreviews(updatedPreviews);
  };

  const handleAddComment = () => {
    if (!newComment.trim() && selectedImages.length === 0) return;

    addComment(
      { taskId, text: newComment, images: selectedImages },
      {
        onSuccess: () => {
          setNewComment("");
          setSelectedImages([]);
          // Clean up object URLs
          imagePreviews.forEach(url => URL.revokeObjectURL(url));
          setImagePreviews([]);
          toast.success("Comment added successfully");
        },
        onError: (error: any) => {
          toast.error(error.response?.data?.message || "Failed to add comment");
          console.log(error);
        },
      }
    );
  };

  if (isLoading)
    return (
      <div>
        <Loader />
      </div>
    );

  return (
    <div className="bg-card rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-medium mb-4">Comments</h3>

      <ScrollArea className="h-[300px] mb-4">
        {comments?.length > 0 ? (
          comments.map((comment) => (
            <div key={comment._id} className="flex gap-4 py-2">
              <Avatar className="size-8">
                <AvatarImage src={comment.author.profilePicture} />
                <AvatarFallback>{comment.author.name.charAt(0)}</AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-sm">
                    {comment.author.name}
                  </span>

                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(comment.createdAt, {
                      addSuffix: true,
                    })}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground">{comment.text}</p>
                
                {/* Display attached images */}
                {comment.attachments && comment.attachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {comment.attachments.map((attachment, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={attachment.fileUrl}
                          alt={attachment.fileName || `Attachment ${idx + 1}`}
                          className="h-20 w-20 object-cover rounded border cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(attachment.fileUrl, '_blank')}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">No comment yet</p>
          </div>
        )}
      </ScrollArea>

      <Separator className="my-4" />

      <div className="mt-4 space-y-3">
        <Textarea
          placeholder="Add a comment"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
        />

        {/* Image Upload Section */}
        <div className="space-y-2">
          <div
            className={`border-2 border-dashed rounded-lg p-3 text-center transition-colors cursor-pointer ${
              isDragOver
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <ImageIcon className={`mx-auto h-6 w-6 ${isDragOver ? 'text-blue-400' : 'text-gray-400'}`} />
            <p className={`mt-1 text-xs ${isDragOver ? 'text-blue-600' : 'text-gray-600'}`}>
              {isDragOver ? 'Drop images here' : 'Click or drag to upload images'}
            </p>
            <p className="text-xs text-gray-500">
              Max 5MB each
            </p>
          </div>

          {/* Image Previews */}
          {imagePreviews.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative group">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="h-20 w-20 object-cover rounded border"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            disabled={(!newComment.trim() && selectedImages.length === 0) || isPending}
            onClick={handleAddComment}
          >
            {isPending ? "Posting..." : "Post Comment"}
          </Button>
        </div>
      </div>
    </div>
  );
};
