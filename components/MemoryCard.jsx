'use client';
import Image from 'next/image';

const MemoryCard = ({ memory }) => {
  // A memory can outlive its author's account, so creator may be missing.
  const creator = memory.creator;

  return (
    <div className="prompt_card">
      <div className="flex justify-between items-start gap-5">
        <div className="flex-1 flex justify-start items-center gap-3">
          {creator?.image && (
            <Image
              src={creator.image}
              alt=""
              width={40}
              height={40}
              className="rounded-full object-contain"
            />
          )}
          <h3 className="font-satoshi font-semibold text-gray-900">
            {creator?.username ?? 'Familia'}
          </h3>
        </div>
      </div>
      <p className="my-4 font-satoshi text-sm text-gray-700 whitespace-pre-line">{memory.memory}</p>
      <p className="font-inter text-sm blue_gradient">{memory.tag}</p>
    </div>
  );
};

export default MemoryCard;
