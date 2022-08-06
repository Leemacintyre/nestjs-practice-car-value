import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { User } from './user.entity';
import { UsersService } from './users.service';

let service: AuthService;
let fakeUsersService: Partial<UsersService>;

describe('AuthService', () => {
  const users: User[] = [];
  const multiply = 9999999999;
  beforeEach(async () => {
    // create fake copy of users service

    fakeUsersService = {
      find: (email: string) => {
        const filteredUsers = users.filter((user) => user.email === email);
        return Promise.resolve(filteredUsers);
      },
      create: (email: string, password: string) => {
        const user = {
          id: Math.floor(Math.random() * multiply),
          email,
          password,
        } as User;
        users.push(user);
        return Promise.resolve(user);
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: fakeUsersService,
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('can create instance of auth service', async () => {
    expect(service).toBeDefined();
  });

  it('creates a new user with a salted and hashed password', async () => {
    const user = await service.signUp('asdf@asdf.com', 'asdf');
    expect(user.password).not.toEqual('asdf');
    const [salt, hash] = user.password.split('.');
    expect(salt).toBeDefined();
    expect(hash).toBeDefined();
  });

  it('throws an error if user signs up with email that is in use', async () => {
    try {
      await service.signUp('asdf@asdf.com', 'asdf');
      await service.signUp('asdf@asdf.com', 'asdf');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toBe('email in use');
    }
  });

  it('throws if sign in is called with an unused email', async () => {
    try {
      await service.signIn('asdf@asdf.com', 'asdf');
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe('user not found');
    }
  });

  it('throws if an invalid password is provided', async () => {
    try {
      await service.signUp('fdsfsdf', 'fsdfsd');
      await service.signIn('fdsfsdf', 'fsdfs');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toBe('bad password');
    }
  });

  it('returns user is correct password is provided', async () => {
    await service.signUp('a@a.com', 'qwe');
    const user = await service.signIn('a@a.com', 'qwe');

    expect(user).toBeDefined();
  });
});
