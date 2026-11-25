from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Notification, User
from .permissions import SUPER
from .serializers import (
    ChangePasswordSerializer, LoginSerializer, NotificationSerializer, ProfileSerializer, UserSerializer,
)


class LoginView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]
    serializer_class = LoginSerializer


class LogoutView(APIView):
    """Blacklist refresh token sehingga tidak bisa dipakai lagi."""

    def post(self, request):
        try:
            RefreshToken(request.data.get("refresh", "")).blacklist()
        except TokenError:
            pass
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        ser = ProfileSerializer(request.user, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(UserSerializer(request.user).data)


class ChangePasswordView(APIView):
    def post(self, request):
        ser = ChangePasswordSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        if not request.user.check_password(ser.validated_data["old_password"]):
            raise ValidationError({"old_password": "Password lama salah."})
        request.user.set_password(ser.validated_data["new_password"])
        request.user.save()
        return Response({"detail": "Password berhasil diubah."})


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.select_related("warehouse").all()
    serializer_class = UserSerializer
    write_roles = (SUPER,)
    filterset_fields = ["role", "is_active", "warehouse"]
    search_fields = ["username", "first_name", "last_name", "email"]
    ordering_fields = ["username", "first_name", "date_joined"]

    def perform_destroy(self, instance):
        if instance.pk == self.request.user.pk:
            raise ValidationError({"detail": "Anda tidak dapat menghapus akun sendiri."})
        instance.delete()


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    filterset_fields = ["is_read", "level"]

    def get_queryset(self):
        user = self.request.user
        qs = Notification.objects.filter(Q(user=user) | Q(user__isnull=True))
        wh = self.request.query_params.get("warehouse")
        if wh:
            qs = qs.filter(Q(warehouse_id=wh) | Q(warehouse__isnull=True))
        return qs

    @action(detail=True, methods=["post"])
    def read(self, request, pk=None):
        obj = self.get_object()
        obj.is_read = True
        obj.save(update_fields=["is_read"])
        return Response(self.get_serializer(obj).data)

    @action(detail=False, methods=["post"], url_path="read-all")
    def read_all(self, request):
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({"detail": "ok"})
