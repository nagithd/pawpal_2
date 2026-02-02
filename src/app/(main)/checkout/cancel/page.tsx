export default function CancelPage() {
  return (
    <div className="min-h-[125vh] flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="bg-white p-10 rounded-2xl text-center shadow-xl">
        <h1 className="text-3xl font-bold text-red-500 mb-4">
          Thanh toán bị huỷ
        </h1>
        <p className="text-gray-700">Bạn có thể thử lại bất cứ lúc nào</p>
      </div>
    </div>
  );
}
